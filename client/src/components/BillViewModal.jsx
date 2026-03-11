/**
 * components/BillViewModal.jsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   1. WhatsApp share button added to footer actions
 *   2. shareOnWhatsApp() imported from whatsapp.util.js
 *   3. No other logic changed
 *
 * UX decision:
 *   - Button order: WhatsApp (primary action, green) → Download PDF → Close
 *   - WhatsApp is the #1 action because the admin's job is to notify the
 *     customer. Download is secondary (their own record-keeping).
 *   - No phone number? Button still works — WA opens, user picks contact.
 */

import { useEffect } from "react";
import { Download, X, CheckCircle2, Clock, AlertCircle, Building2 } from "lucide-react";
import { useTenant } from "../hooks/useTenant";
import { shareOnWhatsApp } from "../utils/whatsapp.util";
import defaultLogo from "../assets/logo.png";

export default function BillViewModal({ bill, customer, onClose, downloadBill }) {
  const { tenant } = useTenant();

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!bill) return null;

  const fmt = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

  const fmtCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;
  const pending = Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid));

  const statusConfig = {
    PAID:    { label: "Paid",    icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    PARTIAL: { label: "Partial", icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-100"       },
    UNPAID:  { label: "Unpaid",  icon: AlertCircle,  cls: "bg-red-50 text-red-600 border-red-100"             },
  };
  const status     = statusConfig[bill.status] || statusConfig.UNPAID;
  const StatusIcon = status.icon;

  const logoSrc      = tenant?.logoUrl || defaultLogo;
  const businessName = tenant?.businessName || tenant?.name || "Dairy";

  const handleWhatsApp = () => {
    shareOnWhatsApp({ bill, customer, dairyName: businessName });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center
        items-start z-[60] px-4 py-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-auto"
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={businessName}
                className="w-14 h-14 object-contain rounded-xl bg-gray-50 p-0.5 flex-shrink-0"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-base font-bold text-gray-900">{businessName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Invoice · Generated {fmt(bill.createdAt || bill.generatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold
              px-2.5 py-1 rounded-full border ${status.cls}`}>
              <StatusIcon size={11} />
              {status.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border
                border-gray-200 hover:bg-gray-50 transition text-gray-500"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Meta ── */}
        <div className="px-6 py-5 grid grid-cols-2 gap-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Billed To
            </p>
            <p className="text-sm font-bold text-gray-900">{customer?.name || "Customer"}</p>
            {customer?.phone && (
              <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Billing Period
            </p>
            <p className="text-sm font-bold text-gray-900">
              {fmt(bill.fromDate)} – {fmt(bill.toDate)}
            </p>
            <span className={`inline-flex sm:hidden items-center gap-1 text-[10px] font-bold
              px-2 py-0.5 rounded-full border mt-1 ${status.cls}`}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
        </div>

        {/* ── Items Table ── */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Delivery Items
          </p>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Product</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wide">Rate</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bill.deliveryItems?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(item.date)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.productName}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmtCurrency(item.rate)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Totals ── */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Total</span>
                <span className="font-semibold text-gray-900">{fmtCurrency(bill.deliveryTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-semibold text-emerald-600">{fmtCurrency(bill.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2.5">
                <span className="font-bold text-gray-900">Pending</span>
                <span className={`font-bold text-base ${pending > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtCurrency(pending)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">

          {/* WhatsApp — primary action, leftmost, green */}
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]
              hover:bg-[#1ebe5d] active:bg-[#17a854] text-white py-2.5 rounded-xl
              text-sm font-semibold transition-colors"
          >
            {/* WhatsApp SVG icon — no extra package needed */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
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
            Share on WhatsApp
          </button>

          {/* Download PDF */}
          <button
            onClick={() => downloadBill(bill._id)}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900
              hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Download size={14} />
            Download PDF
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200
              py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors text-gray-700"
          >
            <X size={14} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}