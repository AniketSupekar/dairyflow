/**
 * utils/whatsapp.util.js
 *
 * TODAY  → wa.me deep link — free, no API, works on any device
 * FUTURE → swap openWhatsApp() for WATI/Twilio API call at 10+ tenants
 *
 * UPI payment link:
 *   Clean /pay URL → Vercel serves pay.html → auto-redirects to upi://
 *   WhatsApp makes https:// links tappable — customer taps → UPI app opens
 *   with dairy name, logo and amount pre-filled.
 */

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
 * Builds a tappable HTTPS pay link.
 * Returns empty string if upiId is not set or amount is 0 / negative.
 *
 * @param {string} upiId      - tenant UPI VPA e.g. "9876543210@ybl"
 * @param {string} dairyName  - shown as payee name in UPI app
 * @param {number} amount     - exact amount due (must be > 0)
 * @param {string} [logoUrl]  - tenant logo Cloudinary URL (optional)
 */
const buildUpiLine = (upiId, dairyName, amount, logoUrl) => {
  if (!upiId || !upiId.trim() || Number(amount) <= 0) return "";

  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent(dairyName || "Dairy");
  const am = Number(amount).toFixed(2);
  const tn = encodeURIComponent("Milk Bill");

  // Clean pay.html URL — tappable in WhatsApp, Vercel serves it directly
  let payUrl = `${APP_DOMAIN}/pay.html?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}`;
  if (logoUrl) payUrl += `&logo=${encodeURIComponent(logoUrl)}`;

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
 * @param {string} [params.logoUrl]   - tenant logo URL (optional)
 */
export const buildWhatsAppMessage = ({ bill, customer, dairyName, upiId, logoUrl }) => {
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

  const upiLine = buildUpiLine(upiId, dairy, pending, logoUrl);

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
 * @param {string} [params.logoUrl]     - optional
 */
export const buildReminderMessage = ({ customerName, dairyName, outstanding, upiId, logoUrl }) => {
  const dairy  = dairyName || "Dairy";
  const name   = customerName || "Customer";
  const amount = fmtRs(outstanding);

  const upiLine = buildUpiLine(upiId, dairy, outstanding, logoUrl);

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
 */
const normalizePhone = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10)                            return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

/**
 * Opens WhatsApp with a pre-filled message.
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
export const shareOnWhatsApp = ({ bill, customer, dairyName, upiId, logoUrl }) => {
  const message = buildWhatsAppMessage({ bill, customer, dairyName, upiId, logoUrl });
  openWhatsApp({ phone: customer?.phone, message });
};