/**
 * utils/whatsapp.util.js
 *
 * TODAY  → wa.me deep link — free, no API, works on any device
 * FUTURE → swap openWhatsApp() for WATI/Twilio API call at 10+ tenants
 */

const fmtRs = (val) => `Rs. ${Number(val || 0).toFixed(2)}`;

const fmtPeriod = (from, to) => {
  const opts  = { day: "numeric", month: "short" };
  const optsY = { day: "numeric", month: "short", year: "numeric" };
  return (
    `${new Date(from).toLocaleDateString("en-IN", opts)} - ` +
    `${new Date(to).toLocaleDateString("en-IN", optsY)}`
  );
};

/**
 * Full bill message — sent from BillViewModal after generating a bill.
 *
 * @param {object} params.bill        - bill document
 * @param {object} params.customer    - { name, phone }
 * @param {string} params.dairyName   - tenant.name (pass explicitly, don't rely on context here)
 */
export const buildWhatsAppMessage = ({ bill, customer, dairyName }) => {
  const pending  = Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid));
  const isPaid   = bill.status === "PAID";
  const period   = fmtPeriod(bill.fromDate, bill.toDate);
  const dairy    = dairyName || "Dairy";
  const name     = customer?.name || "Customer";

  if (isPaid) {
    return (
      `Namaste ${name},\n\n` +
      `Your milk delivery bill from *${dairy}* has been settled. Thank you for the payment.\n\n` +
      `- Period  : ${period}\n` +
      `- Amount Paid : ${fmtRs(bill.amountPaid)}\n` +
      `- Status  : Paid in full\n\n` +
      `For any queries, feel free to contact us.`
    );
  }

  return (
    `Namaste ${name},\n\n` +
    `Please find your milk delivery bill from *${dairy}* below.\n\n` +
    `- Period      : ${period}\n` +
    `- Total Amount : ${fmtRs(bill.totalAmount)}\n` +
    `- Amount Paid  : ${fmtRs(bill.amountPaid)}\n` +
    `- *Balance Due  : ${fmtRs(pending)}*\n\n` +
    `Kindly clear the balance at your earliest convenience.\n` +
    `Thank you.`
  );
};

/**
 * Reminder message — sent from OutstandingPage without a bill object.
 *
 * @param {string} params.customerName
 * @param {string} params.dairyName
 * @param {number} params.outstanding
 */
export const buildReminderMessage = ({ customerName, dairyName, outstanding }) => {
  const dairy  = dairyName || "Dairy";
  const name   = customerName || "Customer";
  const amount = fmtRs(outstanding);

  return (
    `Namaste ${name},\n\n` +
    `This is a gentle reminder from *${dairy}* regarding your outstanding milk delivery dues.\n\n` +
    `- *Balance Due : ${amount}*\n\n` +
    `Kindly clear the balance at your earliest convenience.\n` +
    `Thank you.`
  );
};

/**
 * Normalizes Indian phone numbers to E.164 format (without +).
 * Handles: 10-digit, 0-prefixed 11-digit, 91-prefixed 12-digit.
 */
const normalizePhone = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10)                                return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0"))      return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91"))     return digits;
  return digits;
};

/**
 * Opens WhatsApp with a pre-filled message.
 * Mobile → opens WA app. Desktop → opens web.whatsapp.com.
 */
export const openWhatsApp = ({ phone, message }) => {
  const num     = normalizePhone(phone);
  const encoded = encodeURIComponent(message);
  const url     = num
    ? `https://wa.me/${num}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

/**
 * One-shot: build bill message + open WhatsApp.
 * Used in BillViewModal.
 *
 * IMPORTANT: pass dairyName explicitly from useTenant() at the call site:
 *   shareOnWhatsApp({ bill, customer, dairyName: tenant?.name })
 */
export const shareOnWhatsApp = ({ bill, customer, dairyName }) => {
  const message = buildWhatsAppMessage({ bill, customer, dairyName });
  openWhatsApp({ phone: customer?.phone, message });
};