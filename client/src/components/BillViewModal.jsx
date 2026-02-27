import { useEffect } from "react";
import { Download, X, Printer, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import logo from "../assets/logo.png";

export default function BillViewModal({ bill, customer, onClose, downloadBill }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!bill) return null;

  const fmt = (date) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const fmtCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

  const pending = Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid));

  const statusConfig = {
    PAID: { label: "Paid", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    PARTIAL: { label: "Partial", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-100" },
    UNPAID: { label: "Unpaid", icon: AlertCircle, cls: "bg-red-50 text-red-600 border-red-100" },
  };
  const status = statusConfig[bill.status] || statusConfig.UNPAID;
  const StatusIcon = status.icon;

  const handlePrint = () => window.print();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-[60] px-4 py-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl my-auto"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="Siddhivinayak Dairy"
              className="w-14 h-14 object-cover"
            />
            <div>
              <p className="text-base font-bold text-gray-900">Invoice</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generated {fmt(bill.createdAt || bill.generatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${status.cls}`}>
              <StatusIcon size={11} />
              {status.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Meta section ─────────────────────────────────────────────────── */}
        <div className="px-6 py-5 grid grid-cols-2 gap-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Billed To</p>
            <p className="text-sm font-bold text-gray-900">{customer?.name || "Customer"}</p>
            {customer?.phone && (
              <p className="text-xs text-gray-500 mt-0.5">{customer.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Billing Period</p>
            <p className="text-sm font-bold text-gray-900">
              {fmt(bill.fromDate)} – {fmt(bill.toDate)}
            </p>
            <span className={`inline-flex sm:hidden items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${status.cls}`}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
        </div>

        {/* ── Items Table — horizontal scroll on mobile ─────────────────────── */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Delivery Items</p>
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

          {/* ── Totals ───────────────────────────────────────────────────────── */}
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

        {/* ── Footer Actions ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => downloadBill(bill._id)}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Download size={14} />
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition text-gray-700"
          >
            <X size={14} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}