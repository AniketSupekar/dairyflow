import { useEffect, useState } from "react";
import api from "../api/axios";
import BillViewModal from "./BillViewModal";
import {
  X, Download, Eye, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, ChevronDown, ChevronUp, CreditCard, FileText,
} from "lucide-react";

// ── shared download helper ────────────────────────────────────────────────────
// hintMeta = { customerName, laneName, fromDate } — used as filename fallback
// when CORS hasn't exposed Content-Disposition yet.
// Permanent fix: add  exposedHeaders: ["Content-Disposition"]  to your cors config.
const triggerDownload = (blob, filename) => {
  const url  = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const buildFilename = (billId, meta = {}) => {
  const safe = (s) => (s || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  const monthYear = meta.fromDate
    ? new Date(meta.fromDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }).replace(" ", "")
    : "";
  const parts = [safe(meta.customerName), safe(meta.laneName), monthYear].filter(Boolean);
  return parts.length ? parts.join("_") + ".pdf" : `bill-${billId}.pdf`;
};

export default function CustomerFinancialPanel({ customerId, customer, onClose }) {
  const [visible, setVisible] = useState(true);
  const [summary, setSummary] = useState(null);

  // Bills
  const [bills, setBills]               = useState([]);
  const [billPagination, setBillPagination] = useState({});
  const [billPage, setBillPage]         = useState(1);
  const [showAllBills, setShowAllBills] = useState(false);
  const [billsOpen, setBillsOpen]       = useState(true);

  // Payments
  const [payments, setPayments]               = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({});
  const [paymentPage, setPaymentPage]         = useState(1);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [paymentsOpen, setPaymentsOpen]       = useState(false); // collapsed by default

  // Shared
  const [monthFilter, setMonthFilter] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedBill, setSelectedBill]   = useState(null);

  // Payment form
  const [amount, setAmount]           = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote]               = useState("");
  const [adding, setAdding]           = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [payFormOpen, setPayFormOpen] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (customerId) fetchSummary();  }, [customerId]);
  useEffect(() => { if (customerId) fetchBills();    }, [customerId, billPage, monthFilter, showAllBills]);
  useEffect(() => { if (customerId) fetchPayments(); }, [customerId, paymentPage, monthFilter, showAllPayments]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/billing/customer-summary/${customerId}`);
      setSummary(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchBills = async () => {
    try {
      const limit = showAllBills ? 10 : 3;
      const res = await api.get(`/billing/customer/${customerId}`, {
        params: { page: billPage, limit, month: monthFilter || undefined },
      });
      setBills(res.data.data.data);
      setBillPagination(res.data.data.pagination);
    } catch (err) { console.error(err); }
  };

  const fetchPayments = async () => {
    try {
      const limit = showAllPayments ? 10 : 3;
      const res = await api.get(`/payments/${customerId}`, {
        params: { page: paymentPage, limit, month: monthFilter || undefined },
      });
      setPayments(res.data.data.data);
      setPaymentPagination(res.data.data.pagination);
    } catch (err) { console.error(err); }
  };

  const handlePayment = async () => {
    setPaymentError("");
    if (!amount || Number(amount) <= 0) { setPaymentError("Amount must be greater than 0."); return; }
    if (!paymentDate)                    { setPaymentError("Payment date is required."); return; }
    if (new Date(paymentDate) > new Date()) { setPaymentError("Payment date cannot be in the future."); return; }
    setAdding(true);
    try {
      await api.post("/payments", {
        customerId, amount: Number(amount), paymentMode,
        date: paymentDate, note: note.trim() || undefined,
      });
      setAmount(""); setNote(""); setPayFormOpen(false);
      setPaymentDate(new Date().toISOString().split("T")[0]);
      await Promise.all([fetchSummary(), fetchBills(), fetchPayments()]);
    } catch (err) {
      setPaymentError(err?.response?.data?.message || "Failed to add payment.");
    }
    setAdding(false);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await api.delete(`/payments/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      await Promise.all([fetchSummary(), fetchBills(), fetchPayments()]);
    } catch (err) { console.error(err); }
    setDeleting(false);
  };

  // ── THE FIX: extract filename from header, fall back to building it from meta
  const downloadBill = async (billId, meta = {}) => {
    if (downloadingId) return;
    setDownloadingId(billId);
    try {
      const response = await api.get(`/billing/${billId}/pdf`, { responseType: "blob" });

      // Try Content-Disposition first (works after adding exposedHeaders: ["Content-Disposition"] to cors)
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";\n]+)"?/i);
      const filename = match?.[1]?.trim() || buildFilename(billId, {
        customerName: customer?.name,
        laneName: meta.laneName,
        fromDate: meta.fromDate,
      });

      triggerDownload(response.data, filename);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleClose = () => {
    setVisible(false);
    if (typeof onClose === "function") onClose();
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto px-4 py-8"
        onMouseDown={handleClose}
      >
        <div
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl mb-8"
          onMouseDown={(e) => e.stopPropagation()}
        >

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {customer?.name || "Customer"} : Financials
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Bills, payments and outstanding balance</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Month Filter</p>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => { setMonthFilter(e.target.value); setBillPage(1); setPaymentPage(1); }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50"
                />
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-500"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── Summary Cards ── */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label="Total Billed"  value={summary.totalBilled} />
                <SummaryCard label="Total Paid"    value={summary.totalPaid}              color="green" />
                <SummaryCard label="Advance"       value={summary.advanceBalance || 0}    color="blue"  />
                <SummaryCard label="Outstanding"   value={summary.totalOutstanding}       color="red"   />
              </div>
            )}

            {/* ── Quick Pay button (opens inline form) ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setPayFormOpen(!payFormOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <CreditCard size={14} className="text-gray-400" />
                  Record Payment
                </span>
                {payFormOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>

              {payFormOpen && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                  {paymentError && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      <AlertTriangle size={12} className="flex-shrink-0" />{paymentError}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" min="1"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 focus:bg-white" />
                    <input type="date" value={paymentDate} max={new Date().toISOString().split("T")[0]} onChange={(e) => setPaymentDate(e.target.value)}
                      className="sm:w-40 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 focus:bg-white" />
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                      className="sm:w-32 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 focus:bg-white">
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK">Bank</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={120}
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 focus:bg-white" />
                    <button type="button" onClick={handlePayment} disabled={adding || !amount}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-900 text-white py-2 rounded-lg hover:bg-black transition font-semibold disabled:opacity-50">
                      {adding ? "Adding…" : "Add Payment"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bills — collapsible section ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setBillsOpen(!billsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" />
                  Bills
                  {billPagination?.total > 0 && (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {billPagination.total}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {billsOpen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllBills(!showAllBills); setBillPage(1); }}
                      className="text-xs text-gray-400 hover:text-gray-700 font-semibold transition"
                    >
                      {showAllBills ? "Show less" : "View all"}
                    </button>
                  )}
                  {billsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </button>

              {billsOpen && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                  {!bills.length ? (
                    <EmptyState text="No bills found for this period" />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {bills.map((bill) => (
                        <BillCard
                          key={bill._id}
                          bill={bill}
                          downloading={downloadingId === bill._id}
                          onView={() => setSelectedBill(bill)}
                          onDownload={() => downloadBill(bill._id, {
                            customerName: customer?.name,
                            fromDate: bill.fromDate,
                          })}
                        />
                      ))}
                    </div>
                  )}
                  {showAllBills && (
                    <Pagination pagination={billPagination} page={billPage} setPage={setBillPage} />
                  )}
                </div>
              )}
            </div>

            {/* ── Payments — collapsible section ── */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setPaymentsOpen(!paymentsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <CreditCard size={14} className="text-gray-400" />
                  Payment History
                  {paymentPagination?.total > 0 && (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {paymentPagination.total}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {paymentsOpen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAllPayments(!showAllPayments); setPaymentPage(1); }}
                      className="text-xs text-gray-400 hover:text-gray-700 font-semibold transition"
                    >
                      {showAllPayments ? "Show less" : "View all"}
                    </button>
                  )}
                  {paymentsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </button>

              {paymentsOpen && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
                  {!payments.length ? (
                    <EmptyState text="No payments found for this period" />
                  ) : (
                    payments.map((pay) => (
                      <PaymentRow key={pay._id} payment={pay} onDelete={() => setDeleteConfirmId(pay._id)} />
                    ))
                  )}
                  {showAllPayments && (
                    <Pagination pagination={paymentPagination} page={paymentPage} setPage={setPaymentPage} />
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Reverse this payment?</p>
                <p className="text-xs text-gray-400 mt-1">This will soft-delete the payment and recalculate all bill statuses automatically.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 border border-gray-200 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-gray-700">Cancel</button>
              <button onClick={executeDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                {deleting ? "Reversing…" : "Yes, Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill View Modal */}
      {selectedBill && (
        <BillViewModal
          bill={selectedBill}
          customer={customer}
          onClose={() => setSelectedBill(null)}
          downloadBill={downloadBill}
        />
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }) {
  const colorMap = {
    green: "bg-green-50 text-green-900 border-green-100",
    blue:  "bg-blue-50  text-blue-900  border-blue-100",
    red:   "bg-red-50   text-red-900   border-red-100",
  };
  const base = color ? colorMap[color] : "bg-gray-50 text-gray-900 border-gray-100";
  return (
    <div className={`rounded-xl p-4 border ${base}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-1">{label}</p>
      <p className="text-xl font-bold">₹{Number(value || 0).toFixed(2)}</p>
    </div>
  );
}

function BillCard({ bill, onView, onDownload, downloading }) {
  const statusConfig = {
    PAID:    { cls: "bg-green-100 text-green-800",  label: "Paid"    },
    PARTIAL: { cls: "bg-amber-100 text-amber-800",  label: "Partial" },
    UNPAID:  { cls: "bg-red-100   text-red-800",    label: "Unpaid"  },
  };
  const s   = statusConfig[bill.status] || statusConfig.UNPAID;
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600">{fmt(bill.fromDate)} – {fmt(bill.toDate)}</span>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-sm">
        <span className="text-gray-500">Total</span>
        <span className="text-right font-bold text-gray-900">₹{bill.totalAmount}</span>
        <span className="text-gray-500">Paid</span>
        <span className="text-right font-bold text-green-700">₹{bill.amountPaid}</span>
        {bill.status !== "PAID" && (
          <>
            <span className="text-gray-500">Due</span>
            <span className="text-right font-bold text-red-600">₹{Math.max(0, bill.totalAmount - bill.amountPaid)}</span>
          </>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-900 text-white py-2 rounded-lg hover:bg-black transition font-semibold">
          <Eye size={12} /> View
        </button>
        <button type="button" onClick={onDownload} disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50">
          <Download size={12} /> {downloading ? "…" : "PDF"}
        </button>
      </div>
    </div>
  );
}

function PaymentRow({ payment, onDelete }) {
  const modeColors = {
    CASH:  "bg-green-100  text-green-800",
    UPI:   "bg-blue-100   text-blue-800",
    BANK:  "bg-purple-100 text-purple-800",
    OTHER: "bg-gray-200   text-gray-700",
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${modeColors[payment.paymentMode] || modeColors.OTHER}`}>
          {payment.paymentMode}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">₹{payment.amount}</p>
          <p className="text-xs text-gray-400">
            {new Date(payment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {payment.note && <span className="ml-2 italic">· {payment.note}</span>}
          </p>
        </div>
      </div>
      <button type="button" onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition flex-shrink-0 ml-2">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function Pagination({ pagination, page, setPage }) {
  if (!pagination?.pages || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-2">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition">
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-semibold text-gray-500">{page} / {pagination.pages}</span>
      <button type="button" disabled={page === pagination.pages} onClick={() => setPage(page + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <p className="text-xs font-semibold text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
      {text}
    </p>
  );
}