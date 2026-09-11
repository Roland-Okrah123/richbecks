const { db, auth, FieldValue } = require("../firebaseAdmin");
const { requireAuth, requireRole } = require("../middleware/auth");

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeReference(prefix, id) {
  return `${prefix}-${Date.now()}-${id.slice(0, 6).toUpperCase()}`;
}

function sendError(res, error) {
  const statusMap = {
    "invalid-argument": 400,
    "not-found": 404,
    "failed-precondition": 412,
    "permission-denied": 403,
    "unauthenticated": 401,
    "already-exists": 409,
  };

  const code = error?.code || "internal";
  const status = statusMap[code] || 500;

  return res.status(status).json({
    success: false,
    error: code,
    message: error?.message || "An unexpected error occurred.",
  });
}

function apiError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/* =========================================================
   CREATE SALE
   ========================================================= */

async function createSale(req, res) {
  try {
    const authContext = req.auth;
    const data = req.body || {};

    const customerId = data.customer_id || null;
    const items = Array.isArray(data.items) ? data.items : [];
    const discount = Math.max(0, number(data.discount));
    const amountPaid = Math.max(0, number(data.amount_paid));
    const paymentMethod = data.payment_method || "cash";

    if (items.length === 0) {
      throw apiError(
        "invalid-argument",
        "A sale must contain at least one item.",
      );
    }

    const saleRef = db.collection("sales").doc();
    let saleResult = null;

    await db.runTransaction(async (transaction) => {
      let customerSnap = null;

      if (customerId) {
        const customerRef = db
          .collection("customers")
          .doc(customerId);

        customerSnap = await transaction.get(customerRef);

        if (!customerSnap.exists) {
          throw apiError(
            "not-found",
            "Customer was not found.",
          );
        }
      }

      const preparedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const fabricId = item.fabric_id;
        const yards = number(item.yards);

        if (!fabricId || yards <= 0) {
          throw apiError(
            "invalid-argument",
            "Each sale item must have a valid fabric and quantity.",
          );
        }

        const fabricRef = db
          .collection("fabrics")
          .doc(fabricId);

        const fabricSnap = await transaction.get(fabricRef);

        if (!fabricSnap.exists) {
          throw apiError(
            "not-found",
            `Fabric ${fabricId} was not found.`,
          );
        }

        const fabric = fabricSnap.data();
        const remaining = number(fabric.remaining_yards);

        if (yards > remaining) {
          throw apiError(
            "failed-precondition",
            `Not enough stock for ${fabric.name}. ` +
            `Available: ${remaining} yards.`,
          );
        }

        const price = number(fabric.selling_price_yard);
        const lineTotal = yards * price;

        subtotal += lineTotal;

        preparedItems.push({
          fabricId,
          yards,
          price,
          lineTotal,
          fabric,
          fabricRef,
        });
      }

      const safeDiscount = Math.min(discount, subtotal);

      const total = Math.max(
        0,
        subtotal - safeDiscount,
      );

      const appliedAmountPaid = Math.min(
        amountPaid,
        total,
      );

      const balance = Math.max(
        0,
        total - appliedAmountPaid,
      );

      const change = Math.max(
        0,
        amountPaid - total,
      );

      const invoiceNo = makeReference(
        "INV",
        saleRef.id,
      );

      transaction.set(saleRef, {
        invoice_no: invoiceNo,
        customer_id: customerId,
        subtotal,
        discount: safeDiscount,
        total,
        amount_paid: appliedAmountPaid,
        balance_due: balance,
        change,
        payment_method: paymentMethod,
        cashier_id: authContext.uid,
        status: balance > 0 ? "credit" : "paid",
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      for (const item of preparedItems) {
        const itemRef = saleRef
          .collection("items")
          .doc();

        transaction.set(itemRef, {
          fabric_id: item.fabricId,
          fabric_name: item.fabric.name || "",
          material_type: item.fabric.material_type || "",
          color_number: item.fabric.color_number || "",
          color: item.fabric.color || "",
          yards: item.yards,
          price_per_yard: item.price,
          amount: item.lineTotal,
          created_at: FieldValue.serverTimestamp(),
        });

        const newRemaining =
          number(item.fabric.remaining_yards) -
          item.yards;

        transaction.update(item.fabricRef, {
          remaining_yards: newRemaining,
          updated_at: FieldValue.serverTimestamp(),
        });

        const movementRef = item.fabricRef
          .collection("stock_movements")
          .doc();

        transaction.set(movementRef, {
          type: "sale",
          quantity: -item.yards,
          reference_id: saleRef.id,
          performed_by: authContext.uid,
          created_at: FieldValue.serverTimestamp(),
        });
      }

      if (customerId && customerSnap) {
        const customerRef = db
          .collection("customers")
          .doc(customerId);

        const customer = customerSnap.data();

        const previousSpent =
          number(customer.total_spent);

        const previousCredit =
          number(customer.credit_balance);

        transaction.update(customerRef, {
          total_spent: previousSpent + total,
          credit_balance: previousCredit + balance,
          is_frequent: previousSpent + total >= 1000,
          updated_at: FieldValue.serverTimestamp(),
        });

        if (balance > 0) {
          const creditRef = db
            .collection("credits")
            .doc();

          transaction.set(creditRef, {
            sale_id: saleRef.id,
            customer_id: customerId,
            amount_owed: balance,
            original_amount: balance,
            amount_paid: 0,
            status: "on_track",
            payment_method: paymentMethod,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }

      saleResult = {
        id: saleRef.id,
        invoice_no: invoiceNo,
        subtotal,
        discount: safeDiscount,
        total,
        amount_paid: appliedAmountPaid,
        balance_due: balance,
        change,
        payment_method: paymentMethod,
        status: balance > 0 ? "credit" : "paid",
        created_at: new Date().toISOString(),
        items: preparedItems.map((item) => ({
          fabric_id: item.fabricId,
          fabric_name: item.fabric.name || "",
          material_type: item.fabric.material_type || "",
          color_number: item.fabric.color_number || "",
          color: item.fabric.color || "",
          yards: item.yards,
          price_per_yard: item.price,
          amount: item.lineTotal,
        })),
      };
    });

    return res.json({
      success: true,
      data: saleResult,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   RECORD PURCHASE
   ========================================================= */

async function recordPurchase(req, res) {
  try {
    const authContext = req.auth;
    const data = req.body || {};

    const supplierId = data.supplier_id;
    const items = Array.isArray(data.items) ? data.items : [];

    const transportCost = Math.max(
      0,
      number(data.transport_cost),
    );

    const otherCosts = Math.max(
      0,
      number(data.other_costs),
    );

    if (!supplierId || items.length === 0) {
      throw apiError(
        "invalid-argument",
        "Supplier and purchase items are required.",
      );
    }

    const purchaseRef = db.collection("purchases").doc();
    let purchaseResult = null;

    await db.runTransaction(async (transaction) => {
      const supplierRef = db
        .collection("suppliers")
        .doc(supplierId);

      const supplierSnap =
        await transaction.get(supplierRef);

      if (!supplierSnap.exists) {
        throw apiError(
          "not-found",
          "Supplier was not found.",
        );
      }

      const prepared = [];
      let subtotal = 0;

      for (const item of items) {
        const fabricId = item.fabric_id;
        const yards = number(item.yards);
        const costPerYard =
          number(item.cost_per_yard);

        if (
          !fabricId ||
          yards <= 0 ||
          costPerYard < 0
        ) {
          throw apiError(
            "invalid-argument",
            "Purchase item contains invalid values.",
          );
        }

        const fabricRef = db
          .collection("fabrics")
          .doc(fabricId);

        const fabricSnap =
          await transaction.get(fabricRef);

        if (!fabricSnap.exists) {
          throw apiError(
            "not-found",
            "Fabric was not found.",
          );
        }

        const fabric = fabricSnap.data();

        const lineTotal =
          yards * costPerYard;

        subtotal += lineTotal;

        prepared.push({
          fabricRef,
          fabric,
          fabricId,
          yards,
          costPerYard,
          lineTotal,
        });
      }

      const total =
        subtotal +
        transportCost +
        otherCosts;

      const purchaseNo = makeReference(
        "PUR",
        purchaseRef.id,
      );

      const supplier = supplierSnap.data();

      transaction.set(purchaseRef, {
        purchase_no: purchaseNo,
        supplier_id: supplierId,
        supplier_name: supplier.name || "",
        subtotal,
        transport_cost: transportCost,
        other_costs: otherCosts,
        total_cost: total,
        total,
        status: "received",
        recorded_by: authContext.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      for (const item of prepared) {
        const itemRef = purchaseRef
          .collection("items")
          .doc();

        transaction.set(itemRef, {
          fabric_id: item.fabricId,
          fabric_name: item.fabric.name || "",
          yards: item.yards,
          cost_per_yard: item.costPerYard,
          amount: item.lineTotal,
          created_at: FieldValue.serverTimestamp(),
        });

        const oldRemaining =
          number(item.fabric.remaining_yards);

        const oldTotalPurchased =
          number(item.fabric.total_yards_purchased);

        transaction.update(item.fabricRef, {
          remaining_yards:
            oldRemaining + item.yards,
          total_yards_purchased:
            oldTotalPurchased + item.yards,
          purchase_price_yard:
            item.costPerYard,
          updated_at:
            FieldValue.serverTimestamp(),
        });

        const movementRef =
          item.fabricRef
            .collection("stock_movements")
            .doc();

        transaction.set(movementRef, {
          type: "purchase",
          quantity: item.yards,
          reference_id: purchaseRef.id,
          performed_by: authContext.uid,
          created_at: FieldValue.serverTimestamp(),
        });
      }

      transaction.update(supplierRef, {
        amount_owed:
          number(supplier.amount_owed) +
          total,
        updated_at:
          FieldValue.serverTimestamp(),
      });

      purchaseResult = {
        id: purchaseRef.id,
        purchase_no: purchaseNo,
        supplier_id: supplierId,
        supplier_name: supplier.name || "",
        subtotal,
        transport_cost: transportCost,
        other_costs: otherCosts,
        total_cost: total,
        total,
        status: "received",
      };
    });

    return res.json({
      success: true,
      data: purchaseResult,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   RECORD CREDIT PAYMENT
   ========================================================= */

async function recordCreditPayment(req, res) {
  try {
    const authContext = req.auth;
    const data = req.body || {};

    const creditId = data.credit_id;
    const paymentAmount = number(data.amount);
    const paymentMethod =
      data.payment_method || "cash";

    if (!creditId || paymentAmount <= 0) {
      throw apiError(
        "invalid-argument",
        "A valid credit and payment amount are required.",
      );
    }

    const creditRef = db
      .collection("credits")
      .doc(creditId);

    let paymentResult = null;

    await db.runTransaction(async (transaction) => {
      const creditSnap =
        await transaction.get(creditRef);

      if (!creditSnap.exists) {
        throw apiError(
          "not-found",
          "Credit record was not found.",
        );
      }

      const credit = creditSnap.data();
      const owed = number(credit.amount_owed);

      if (paymentAmount > owed) {
        throw apiError(
          "invalid-argument",
          "Payment cannot be greater than the outstanding balance.",
        );
      }

      let customerRef = null;
      let customerSnap = null;

      if (credit.customer_id) {
        customerRef = db
          .collection("customers")
          .doc(credit.customer_id);

        customerSnap =
          await transaction.get(customerRef);
      }

      const remaining =
        owed - paymentAmount;

      const cleared =
        remaining <= 0.005;

      const paymentRef =
        creditRef
          .collection("payments")
          .doc();

      transaction.set(paymentRef, {
        amount: paymentAmount,
        payment_method: paymentMethod,
        recorded_by: authContext.uid,
        created_at: FieldValue.serverTimestamp(),
      });

      transaction.update(creditRef, {
        amount_owed: cleared ? 0 : remaining,
        amount_paid:
          number(credit.amount_paid) +
          paymentAmount,
        status:
          cleared ? "cleared" : "on_track",
        updated_at: FieldValue.serverTimestamp(),
      });

      if (
        customerRef &&
        customerSnap &&
        customerSnap.exists
      ) {
        const customer = customerSnap.data();

        transaction.update(customerRef, {
          credit_balance: Math.max(
            0,
            number(customer.credit_balance) -
            paymentAmount,
          ),
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      paymentResult = {
        success: true,
        credit_id: creditId,
        amount: paymentAmount,
        remaining: cleared ? 0 : remaining,
      };
    });

    return res.json({
      success: true,
      data: paymentResult,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   PROCESS RETURN
   ========================================================= */

async function processReturn(req, res) {
  try {
    const authContext = req.auth;
    const data = req.body || {};

    const saleId = data.sale_id || null;
    const fabricId = data.fabric_id;
    const yards = number(data.yards);
    const reason = data.reason || "";

    const refundAmount = Math.max(
      0,
      number(data.refund_amount),
    );

    const returnType =
      data.return_type || "refund";

    if (!fabricId || yards <= 0) {
      throw apiError(
        "invalid-argument",
        "Fabric and return quantity are required.",
      );
    }

    const returnRef =
      db.collection("returns").doc();

    const fabricRef =
      db.collection("fabrics").doc(fabricId);

    await db.runTransaction(async (transaction) => {
      const fabricSnap =
        await transaction.get(fabricRef);

      if (!fabricSnap.exists) {
        throw apiError(
          "not-found",
          "Fabric was not found.",
        );
      }

      const fabric = fabricSnap.data();

      if (saleId) {
        const saleRef =
          db.collection("sales").doc(saleId);

        const saleSnap =
          await transaction.get(saleRef);

        if (!saleSnap.exists) {
          throw apiError(
            "not-found",
            "Sale was not found.",
          );
        }
      }

      transaction.set(returnRef, {
        sale_id: saleId,
        fabric_id: fabricId,
        fabric_name: fabric.name || "",
        yards,
        reason,
        refund_amount: refundAmount,
        return_type: returnType,
        processed_by: authContext.uid,
        created_at: FieldValue.serverTimestamp(),
      });

      transaction.update(fabricRef, {
        remaining_yards:
          number(fabric.remaining_yards) +
          yards,
        updated_at:
          FieldValue.serverTimestamp(),
      });

      const movementRef =
        fabricRef
          .collection("stock_movements")
          .doc();

      transaction.set(movementRef, {
        type: "return",
        quantity: yards,
        reference_id: returnRef.id,
        performed_by: authContext.uid,
        created_at: FieldValue.serverTimestamp(),
      });
    });

    return res.json({
      success: true,
      data: {
        id: returnRef.id,
        success: true,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   CREATE STAFF USER
   ========================================================= */

async function createStaffUser(req, res) {
  try {
    const data = req.body || {};

    const fullName =
      String(data.full_name || "").trim();

    const username =
      String(data.username || "").trim();

    const email =
      String(data.email || "").trim();

    const phone =
      String(data.phone || "").trim();

    const password =
      String(data.password || "");

    const role =
      String(data.role || "cashier");

    if (!fullName || !email || !password) {
      throw apiError(
        "invalid-argument",
        "Full name, email and password are required.",
      );
    }

    const allowedRoles = [
      "owner",
      "manager",
      "cashier",
      "store_keeper",
      "accountant",
    ];

    if (!allowedRoles.includes(role)) {
      throw apiError(
        "invalid-argument",
        "Invalid staff role.",
      );
    }

    let userRecord = null;

    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
      });

      await auth.setCustomUserClaims(
        userRecord.uid,
        { role },
      );

      await db
        .collection("users")
        .doc(userRecord.uid)
        .set({
          full_name: fullName,
          username,
          email,
          phone,
          role,
          is_active: true,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

      return res.json({
        success: true,
        data: {
          success: true,
          uid: userRecord.uid,
        },
      });
    } catch (error) {
      if (userRecord?.uid) {
        try {
          await auth.deleteUser(userRecord.uid);
        } catch (deleteError) {
          // Prevent an orphaned Auth user when possible.
        }
      }

      if (
        error &&
        error.code === "auth/email-already-exists"
      ) {
        throw apiError(
          "already-exists",
          "A user with this email already exists.",
        );
      }

      throw apiError(
        "internal",
        error?.message ||
        "Could not create staff user.",
      );
    }
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   SET USER STATUS
   ========================================================= */

async function setUserStatus(req, res) {
  try {
    const data = req.body || {};
    const uid = data.uid;

    if (!uid) {
      throw apiError(
        "invalid-argument",
        "User ID is required.",
      );
    }

    const isActive = Boolean(data.is_active);

    const userRef =
      db.collection("users").doc(uid);

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw apiError(
        "not-found",
        "User was not found.",
      );
    }

    await userRef.update({
      is_active: isActive,
      updated_at: FieldValue.serverTimestamp(),
    });

    try {
      await auth.updateUser(uid, {
        disabled: !isActive,
      });
    } catch (error) {
      throw apiError(
        "internal",
        "User record was updated but " +
        "authentication status could not be changed.",
      );
    }

    return res.json({
      success: true,
      data: {
        success: true,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

/* =========================================================
   ROUTES
   ========================================================= */

module.exports = {
  createSale,
  recordPurchase,
  recordCreditPayment,
  processReturn,
  createStaffUser,
  setUserStatus,

  middleware: {
    requireAuth,
    requireRole,
  },
};
