import { useEffect, useState } from "react";
import api from "../api/axios";
import BillViewModal from "./BillViewModal";
import { X, Download, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

export default function CustomerFinancialPanel({ customerId, onClose }) {
  const [visible, setVisible] = useState(true); // internal visibility — fixes close bug
  const [summary, setSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [billPagination, setBillPagination] = useState({});
  const [paymentPagination, setPaymentPagination] = useState({});
  const [billPage, setBillPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState("");
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [selectedBill, setSelectedBill] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (customerId) fetchSummary();
  }, [customerId]);

  useEffect(() => {
    if (customerId) fetchBills();
  }, [customerId, billPage, monthFilter, showAllBills]);

  useEffect(() => {
    if (customerId) fetchPayments();
  }, [customerId, paymentPage, monthFilter, showAllPayments]);

  const fetchSummary = async () => {
    const res = await api.get(`/billing/customer-summary/${customerId}`);
    setSummary(res.data.data);
  };

  const fetchBills = async () => {
    const limit = showAllBills ? 10 : 2;
    const res = await api.get(`/billing/customer/${customerId}`, {
      params: { page: billPage, limit, month: monthFilter || undefined },
    });
    setBills(res.data.data.data);
    setBillPagination(res.data.data.pagination);
  };

  const fetchPayments = async () => {
    const limit = showAllPayments ? 10 : 2;
    const res = await api.get(`/payments/${customerId}`, {
      params: { page: paymentPage, limit, month: monthFilter || undefined },
    });
    setPayments(res.data.data.data);
    setPaymentPagination(res.data.data.pagination);
  };

  const handlePayment = async () => {
    if (!amount) return;
    setAdding(true);
    await api.post("/payments", {
      customerId,
      amount: Number(amount),
      paymentMode,
      date: new Date(),
    });
    setAmount("");
    await Promise.all([fetchSummary(), fetchBills(), fetchPayments()]);
    setAdding(false);
  };

  const deletePayment = async (id) => {
    await api.delete(`/payments/${id}`);
    fetchSummary();
    fetchBills();
    fetchPayments();
  };

  const downloadBill = (billId) => {
    window.open(`${import.meta.env.VITE_API_URL}/billing/${billId}/pdf`, "_blank");
  };

  // Fires both internal state + parent callback — no longer depends solely on parent
  const handleClose = () => {
    setVisible(false);
    if (typeof onClose === "function") onClose();
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop — onMouseDown to avoid drag-release false triggers */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto px-4 py-8"
        onMouseDown={handleClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl mb-8"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Customer Financials</h2>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  setBillPage(1);
                  setPaymentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-7">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard label="Total Billed" value={summary.totalBilled} />
                <SummaryCard label="Total Paid" value={summary.totalPaid} color="green" />
                <SummaryCard label="Advance" value={summary.advanceBalance || 0} color="blue" />
                <SummaryCard label="Outstanding" value={summary.totalOutstanding} color="red" />
              </div>
            )}

            {/* Bills */}
            <Section
              title="Bills"
              count={billPagination?.total}
              showAll={showAllBills}
              onToggle={() => { setShowAllBills(!showAllBills); setBillPage(1); }}
            >
              {!bills.length ? (
                <EmptyState text="No bills found for this period" />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {bills.map((bill) => (
                    <BillCard
                      key={bill._id}
                      bill={bill}
                      onView={() => setSelectedBill(bill)}
                      onDownload={() => downloadBill(bill._id)}
                    />
                  ))}
                </div>
              )}
              {showAllBills && (
                <Pagination pagination={billPagination} page={billPage} setPage={setBillPage} />
              )}
            </Section>

            {/* Payments */}
            <Section
              title="Payments"
              count={paymentPagination?.total}
              showAll={showAllPayments}
              onToggle={() => { setShowAllPayments(!showAllPayments); setPaymentPage(1); }}
            >
              {!payments.length ? (
                <EmptyState text="No payments found for this period" />
              ) : (
                <div className="space-y-2">
                  {payments.map((pay) => (
                    <PaymentRow key={pay._id} payment={pay} onDelete={() => deletePayment(pay._id)} />
                  ))}
                </div>
              )}
              {showAllPayments && (
                <Pagination pagination={paymentPagination} page={paymentPage} setPage={setPaymentPage} />
              )}
            </Section>

            {/* Add Payment — stacks vertically on mobile */}
            <div className="border-t border-gray-200 pt-5">
              <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Add Payment
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (₹)"
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="sm:w-36 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK">Bank</option>
                  <option value="OTHER">Other</option>
                </select>
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={adding || !amount}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBill && (
        <BillViewModal
          bill={selectedBill}
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
    green: "bg-green-50 text-green-900",
    blue:  "bg-blue-50 text-blue-900",
    red:   "bg-red-50 text-red-900",
  };
  const base = color ? colorMap[color] : "bg-gray-100 text-gray-900";
  return (
    <div className={`rounded-xl p-4 ${base}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-xl font-bold mt-1">₹{value}</p>
    </div>
  );
}

function Section({ title, count, showAll, onToggle, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {count > 0 && (
            <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showAll ? "Show less" : "View all"}
        </button>
      </div>
      {children}
    </div>
  );
}

function BillCard({ bill, onView, onDownload }) {
  const statusConfig = {
    PAID:    { cls: "bg-green-100 text-green-800",  label: "Paid" },
    PARTIAL: { cls: "bg-amber-100 text-amber-800",  label: "Partial" },
    UNPAID:  { cls: "bg-red-100 text-red-800",      label: "Unpaid" },
  };
  const s = statusConfig[bill.status] || statusConfig.UNPAID;

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">
          {bill.month
            ? new Date(bill.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })
            : "—"}
        </span>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${s.cls}`}>
          {s.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 text-sm">
        <span className="text-gray-600 font-medium">Total</span>
        <span className="text-right font-bold text-gray-900">₹{bill.totalAmount}</span>
        <span className="text-gray-600 font-medium">Paid</span>
        <span className="text-right font-bold text-green-700">₹{bill.amountPaid}</span>
        {bill.status !== "PAID" && (
          <>
            <span className="text-gray-600 font-medium">Due</span>
            <span className="text-right font-bold text-red-600">
              ₹{bill.totalAmount - bill.amountPaid}
            </span>
          </>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
        >
          <Eye size={12} /> View
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
        >
          <Download size={12} /> PDF
        </button>
      </div>
    </div>
  );
}

function PaymentRow({ payment, onDelete }) {
  const modeColors = {
    CASH:  "bg-green-100 text-green-800",
    UPI:   "bg-blue-100 text-blue-800",
    BANK:  "bg-purple-100 text-purple-800",
    OTHER: "bg-gray-200 text-gray-700",
  };
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${modeColors[payment.paymentMode] || modeColors.OTHER}`}>
          {payment.paymentMode}
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">₹{payment.amount}</p>
          <p className="text-xs font-medium text-gray-500">
            {new Date(payment.date).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function Pagination({ pagination, page, setPage }) {
  if (!pagination?.pages || pagination.pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-3">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-semibold text-gray-600">{page} / {pagination.pages}</span>
      <button
        type="button"
        disabled={page === pagination.pages}
        onClick={() => setPage(page + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-xs font-semibold text-gray-500 py-3 text-center">{text}</p>;
}