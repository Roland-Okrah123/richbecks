const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');

// Set these once with:
//   firebase functions:secrets:set WHATSAPP_TOKEN
//   firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
// See DEPLOYMENT_GUIDE.md → "WhatsApp Sale Notifications" for how to obtain them.
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');

const PAYMENT_LABELS = {
  cash: 'Cash',
  mtn_momo: 'MTN Mobile Money',
  vodafone_cash: 'Vodafone Cash',
  airteltigo_money: 'AirtelTigo Money',
  bank: 'Bank Payment',
};

function money(n) {
  return `GHC ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildMessage(sale) {
  const lines = [
    '🧾 *New Sale — Richbecks Enterprise*',
    '',
    `Invoice: ${sale.invoice_no}`,
    `Customer: ${sale.customer_name || 'Walk-in'}`,
    `Total: ${money(sale.total)}`,
    `Paid: ${money(sale.amount_paid)}`,
  ];
  if (sale.balance_due > 0) {
    lines.push(`⚠️ Balance (credit): ${money(sale.balance_due)}`);
  }
  lines.push(`Payment: ${PAYMENT_LABELS[sale.payment_method] || sale.payment_method}`);
  if (sale.cashier_name) lines.push(`Served by: ${sale.cashier_name}`);
  return lines.join('\n');
}

/**
 * Fires every time a new sale is written (i.e. every completed POS
 * checkout, since createSale in sales.js is the only thing that ever
 * creates a sales/{id} document). Sends the Owner a WhatsApp message.
 *
 * This never blocks or breaks a sale: it runs asynchronously AFTER the
 * sale is already committed, and every failure path just logs and returns.
 */
const notifyOwnerOnSale = onDocumentCreated(
  { document: 'sales/{saleId}', secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (event) => {
    const sale = event.data?.data();
    if (!sale) return;

    const db = getFirestore();

    let ownerNumber;
    try {
      const settingsSnap = await db.collection('settings').doc('general').get();
      ownerNumber = settingsSnap.exists ? settingsSnap.data().owner_whatsapp : null;
    } catch (err) {
      logger.error('Could not read owner_whatsapp from settings:', err.message);
      return;
    }

    if (!ownerNumber) {
      logger.info('No owner_whatsapp configured in Settings — skipping WhatsApp notification.');
      return;
    }

    let token, phoneNumberId;
    try {
      token = WHATSAPP_TOKEN.value();
      phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
    } catch (err) {
      logger.info('WhatsApp secrets not configured yet — skipping notification.');
      return;
    }
    if (!token || !phoneNumberId) {
      logger.info('WhatsApp secrets are empty — skipping notification.');
      return;
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: ownerNumber,
          type: 'text',
          text: { body: buildMessage(sale) },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        logger.error('WhatsApp API responded with an error:', res.status, errBody);
      }
    } catch (err) {
      logger.error('WhatsApp notification request failed:', err.message);
    }
  }
);

module.exports = { notifyOwnerOnSale };
