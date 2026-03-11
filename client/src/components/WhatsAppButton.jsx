/**
 * components/WhatsAppButton.jsx
 *
 * Reusable WhatsApp share button.
 * Used in:
 *   - OutstandingPage  (remind customer about dues — no bill object needed)
 *   - BillViewModal    (send full bill message — uses bill object)
 *
 * Two modes controlled by props:
 *   1. bill mode   → pass { bill, customer, dairyName }
 *   2. reminder mode → pass { customer, dairyName, outstandingAmount }
 *
 * Size variants: "sm" (icon + compact text) | "md" (default, full text)
 */

import { shareOnWhatsApp, openWhatsApp } from "../utils/whatsapp.util";

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
      -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
      -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
      .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207
      -.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
      -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2
      5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719
      2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.532 5.853L.073 23.927a.5.5
      0 00.611.611l6.074-1.459A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12
      0zm0 21.818a9.818 9.818 0 01-4.998-1.366l-.358-.213-3.715.893.907-3.617-.234-.372A9.818
      9.818 0 1112 21.818z"/>
  </svg>
);

/**
 * Builds a payment reminder message (no bill object).
 * Used from the outstanding list where we know amount due but not the
 * specific bill breakdown.
 */
const buildReminderMessage = ({ customer, dairyName, outstandingAmount }) => {
  const name   = customer?.name  || "Customer";
  const dairy  = dairyName       || "Dairy";
  const amount = `Rs. ${Number(outstandingAmount || 0).toFixed(2)}`;

  return (
    `Namaste ${name} 🙏\n\n` +
    `This is a gentle reminder from *${dairy}*.\n\n` +
    `💰 *Outstanding Balance: ${amount}*\n\n` +
    `Kindly clear the balance at your earliest convenience.\n` +
    `Thank you! 🙏`
  );
};

export default function WhatsAppButton({
  // Bill share mode
  bill,
  // Reminder mode
  outstandingAmount,
  // Common
  customer,
  dairyName,
  // Display
  size = "md",      // "sm" | "md"
  label,            // override button label
  className = "",
}) {
  const handleClick = () => {
    if (bill) {
      // Full bill message
      shareOnWhatsApp({ bill, customer, dairyName });
    } else {
      // Reminder message
      const message = buildReminderMessage({ customer, dairyName, outstandingAmount });
      openWhatsApp({ phone: customer?.phone, message });
    }
  };

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  const defaultLabel = bill ? "Share on WhatsApp" : "Remind on WhatsApp";

  return (
    <button
      onClick={handleClick}
      title={`Send WhatsApp message to ${customer?.name || "customer"}`}
      className={`
        inline-flex items-center justify-center font-semibold rounded-lg
        bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a854]
        text-white transition-colors
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className={iconSize}>{WA_ICON}</span>
      {label ?? defaultLabel}
    </button>
  );
}