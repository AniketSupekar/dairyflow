import { useEffect, useState } from "react";
import api from "../api/axios";
import BillViewModal from "./BillViewModal";

export default function CustomerFinancialPanel({ customerId, onClose }) {
  const [summary, setSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");

  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    if (customerId) fetchAll();
  }, [customerId]);

  // ESC key close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (selectedBill) {
          setSelectedBill(null);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedBill, onClose]);

  const fetchAll = async () => {
    try {
      const summaryRes = await api.get(
        `/billing/customer-summary/${customerId}`
      );
      const billsRes = await api.get(
        `/billing/customer/${customerId}`
      );
      const paymentsRes = await api.get(
        `/payments/${customerId}`
      );

      setSummary(summaryRes.data.data);
      setBills(billsRes.data.data || []);
      setPayments(paymentsRes.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePayment = async () => {
    if (!amount) return;

    try {
      await api.post("/payments", {
        customerId,
        amount: Number(amount),
        paymentMode,
        date: new Date(),
      });

      setAmount("");
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const deletePayment = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const downloadBill = (billId) => {
    window.open(
      `${import.meta.env.VITE_API_URL}/billing/${billId}/pdf`,
      "_blank"
    );
  };

  const getStatusStyle = (status) => {
    if (status === "PAID")
      return "bg-green-100 text-green-700";
    if (status === "PARTIAL")
      return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <>
      {/* MAIN PANEL */}
      <div
        onClick={() => onClose?.()}
        className="fixed inset-0 bg-black/40 flex justify-center items-start overflow-auto z-50 px-4 py-6"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 space-y-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Customer Financials
            </h2>
            <button
              onClick={() => onClose?.()}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Close
            </button>
          </div>

          {/* Summary */}
          {summary && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard title="Total Billed" value={summary.totalBilled} />
              <SummaryCard title="Total Paid" value={summary.totalPaid} />
              <SummaryCard
                title="Advance"
                value={summary.advanceBalance || 0}
              />
              <SummaryCard
                title="Outstanding"
                value={summary.totalOutstanding}
                dark
              />
            </div>
          )}

          {/* Bills */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Bills
            </h3>

            {bills.length === 0 && (
              <p className="text-sm text-gray-500">
                No bills found
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {bills.map((bill) => (
                <div
                  key={bill._id}
                  className="border border-gray-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span>Total</span>
                    <span>₹{bill.totalAmount}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span>₹{bill.amountPaid}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Status</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusStyle(
                        bill.status
                      )}`}
                    >
                      {bill.status}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="flex-1 text-xs bg-gray-900 text-white py-2 rounded-lg"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadBill(bill._id)}
                      className="flex-1 text-xs border border-gray-300 py-2 rounded-lg"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Payments
            </h3>

            {payments.length === 0 && (
              <p className="text-sm text-gray-500">
                No payments found
              </p>
            )}

            <div className="space-y-2">
              {payments.map((pay) => (
                <div
                  key={pay._id}
                  className="flex justify-between items-center border border-gray-200 rounded-xl p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      ₹{pay.amount}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(pay.date).toLocaleDateString()} • {pay.paymentMode}
                    </p>
                  </div>

                  <button
                    onClick={() => deletePayment(pay._id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Payment */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Add Payment
            </h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />

              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
                <option value="OTHER">Other</option>
              </select>

              <button
                onClick={handlePayment}
                className="bg-gray-900 hover:bg-black text-white text-sm font-medium py-2 rounded-xl"
              >
                Add
              </button>
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

function SummaryCard({ title, value, dark }) {
  return (
    <div
      className={`rounded-xl p-4 ${dark ? "bg-gray-900 text-white" : "bg-gray-50"
        }`}
    >
      <p className={`text-xs ${dark ? "opacity-80" : "text-gray-500"}`}>
        {title}
      </p>
      <p className="text-lg font-semibold">
        ₹{value}
      </p>
    </div>
  );
}