/**
 * utils/whatsapp.util.js
 *
 * TODAY  → wa.me deep link — free, no API, works on any device
 * FUTURE → swap openWhatsApp() for WATI/Twilio API call at 10+ tenants
 *
 * UPI payment link strategy:
 *   Raw upi:// links appear as plain unclickable text in WhatsApp.
 *   Instead we send an HTTPS link to our own /api/pay endpoint which
 *   does a 302 redirect to upi:// — WhatsApp makes HTTPS links tappable,
 *   customer taps → browser → instantly redirects to PhonePe/GPay/Paytm.
 *
 *   Link format: https://{APP_DOMAIN}/api/pay?pa=upiid&pn=Dairy&am=500&tn=Milk+Bill
 */

// ── App domain (set VITE_APP_URL in your .env, e.g. https://yourapp.vercel.app) ──
// Falls back to current origin so it works in dev too
const APP_DOMAIN =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "");

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
 * Builds a tappable HTTPS pay link that redirects to upi:// on the device.
 * Returns empty string if upiId is not set or amount is 0 / negative.
 *
 * @param {string} upiId      - tenant UPI VPA e.g. "9876543210@ybl"
 * @param {string} dairyName  - shown as payee name in UPI app
 * @param {number} amount     - exact amount due (must be > 0)
 */
const buildUpiLine = (upiId, dairyName, amount) => {
  if (!upiId || !upiId.trim() || Number(amount) <= 0) return "";

  // Build URL manually with encodeURIComponent (uses %20 not +)
  // WhatsApp's link detector breaks on + signs — %20 keeps it a clean URL
  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent(dairyName || "Dairy");
  const am = Number(amount).toFixed(2);
  const tn = encodeURIComponent("Milk Bill");

  // HTTPS link → tappable in WhatsApp → backend redirects to upi://
  const payUrl = `${APP_DOMAIN}/pay.html?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}`;

  return (
    `\n💳 *Pay Now:* ${payUrl}\n` +
    `_(Tap to pay via PhonePe, GPay, or Paytm)_`
  );
};

/**
 * Full bill message — sent from BillViewModal after generating a bill.
 *
 * @param {object} params.bill        - bill document
 * @param {object} params.customer    - { name, phone }
 * @param {string} params.dairyName   - tenant.name
 * @param {string} [params.upiId]     - tenant UPI ID (optional)
 */
export const buildWhatsAppMessage = ({ bill, customer, dairyName, upiId }) => {
  const pending  = Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid));
  const isPaid   = bill.status === "PAID";
  const period   = fmtPeriod(bill.fromDate, bill.toDate);
  const dairy    = dairyName || "Dairy";
  const name     = customer?.name || "Customer";

  if (isPaid) {
    return (
      `Namaste ${name},\n\n` +
      `Your milk delivery bill from *${dairy}* has been settled. Thank you for the payment.\n\n` +
      `- Period      : ${period}\n` +
      `- Amount Paid : ${fmtRs(bill.amountPaid)}\n` +
      `- Status      : Paid in full\n\n` +
      `For any queries, feel free to contact us.`
    );
  }

  const upiLine = buildUpiLine(upiId, dairy, pending);

  return (
    `Namaste ${name},\n\n` +
    `Please find your milk delivery bill from *${dairy}* below.\n\n` +
    `- Period       : ${period}\n` +
    `- Total Amount : ${fmtRs(bill.totalAmount)}\n` +
    `- Amount Paid  : ${fmtRs(bill.amountPaid)}\n` +
    `- *Balance Due : ${fmtRs(pending)}*\n` +
    upiLine +
    `\n\nKindly clear the balance at your earliest convenience.\n` +
    `Thank you.`
  );
};

/**
 * Reminder message — sent from OutstandingPage without a bill object.
 *
 * @param {string} params.customerName
 * @param {string} params.dairyName
 * @param {number} params.outstanding
 * @param {string} [params.upiId]       - optional
 */
export const buildReminderMessage = ({ customerName, dairyName, outstanding, upiId }) => {
  const dairy  = dairyName || "Dairy";
  const name   = customerName || "Customer";
  const amount = fmtRs(outstanding);

  const upiLine = buildUpiLine(upiId, dairy, outstanding);

  return (
    `Namaste ${name},\n\n` +
    `This is a gentle reminder from *${dairy}* regarding your outstanding milk delivery dues.\n\n` +
    `- *Balance Due : ${amount}*\n` +
    upiLine +
    `\n\nKindly clear the balance at your earliest convenience.\n` +
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
 */
export const shareOnWhatsApp = ({ bill, customer, dairyName, upiId }) => {
  const message = buildWhatsAppMessage({ bill, customer, dairyName, upiId });
  openWhatsApp({ phone: customer?.phone, message });
};