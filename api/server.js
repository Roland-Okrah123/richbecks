const express = require("express");
const cors = require("cors");

const {
  createSale,
  recordPurchase,
  recordCreditPayment,
  processReturn,
  createStaffUser,
  setUserStatus,
  middleware,
} = require("./routes/richbecks");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "RichBecks API",
    status: "running",
  });
});

const { requireAuth, requireRole } = middleware;

app.post(
  "/api/create-sale",
  requireAuth,
  requireRole(["owner", "manager", "cashier"]),
  createSale,
);

app.post(
  "/api/record-purchase",
  requireAuth,
  requireRole(["owner", "manager", "store_keeper"]),
  recordPurchase,
);

app.post(
  "/api/record-credit-payment",
  requireAuth,
  requireRole(["owner", "manager", "cashier", "accountant"]),
  recordCreditPayment,
);

app.post(
  "/api/process-return",
  requireAuth,
  requireRole(["owner", "manager", "cashier"]),
  processReturn,
);

app.post(
  "/api/create-staff-user",
  requireAuth,
  requireRole(["owner"]),
  createStaffUser,
);

app.post(
  "/api/set-user-status",
  requireAuth,
  requireRole(["owner"]),
  setUserStatus,
);

app.listen(PORT, () => {
  console.log(`RichBecks API running on http://localhost:${PORT}`);
});
