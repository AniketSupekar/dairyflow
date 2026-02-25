import { useEffect, useState } from "react";
import { getCustomersByLane, generateBill } from "../../api/billing.api";
import { getLanes } from "../../api/lane.api";
import CustomerFinancialPanel from "../../components/CustomerFinancialPanel";

const BillingPage = () => {
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [customers, setCustomers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generatedBill, setGeneratedBill] = useState(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [financialCustomerId, setFinancialCustomerId] = useState(null);

  useEffect(() => {
    const fetchLanes = async () => {
      try {
        const res = await getLanes();
        setLanes(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLanes();
  }, []);

  const handleLaneChange = async (laneId) => {
    setSelectedLane(laneId);
    setCustomers([]);
    if (!laneId) return;

    try {
      const res = await getCustomersByLane(laneId);
      setCustomers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (customer) => {
    setSelectedCustomer(customer);
    setGeneratedBill(null);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFromDate("");
    setToDate("");
    setGeneratedBill(null);
    setError("");
    setSuccess("");
  };

  const handleGenerateBill = async () => {
    setError("");
    setSuccess("");

    if (!fromDate || !toDate) {
      setError("Please select a valid date range.");
      return;
    }

    setLoading(true);
    try {
      const res = await generateBill({
        customerId: selectedCustomer._id,
        fromDate,
        toDate,
      });

      setGeneratedBill(res.data.data);
      setSuccess("Bill generated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to generate bill."
      );
    }
    setLoading(false);
  };

  const handleDownload = () => {
    window.open(
      `http://localhost:5000/api/billing/${generatedBill._id}/pdf`,
      "_blank"
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ---------------------------
          IF FINANCIAL VIEW ACTIVE
      ---------------------------- */}
      {financialCustomerId ? (
        <CustomerFinancialPanel
          customerId={financialCustomerId}
          onBack={() => setFinancialCustomerId(null)}
        />
      ) : (
        <>
          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Financials
            </h1>
            <p className="text-sm text-gray-500">
              Select lane and customer to manage financial records
            </p>
          </div>

          {/* LANE SELECTOR */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Lane
            </label>
            <select
              value={selectedLane}
              onChange={(e) => handleLaneChange(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
            >
              <option value="">Select Lane</option>
              {lanes.map((lane) => (
                <option key={lane._id} value={lane._id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>

          {/* CUSTOMER GRID */}
          {customers.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer) => (
                <div
                  key={customer._id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {customer.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Opening Balance: ₹{customer.openingBalance || 0}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(customer)}
                      className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-medium px-3 py-2 rounded-xl transition"
                    >
                      Generate Bill
                    </button>

                    <button
                      onClick={() =>
                        setFinancialCustomerId(customer._id)
                      }
                      className="flex-1 border border-gray-300 text-xs px-3 py-2 rounded-xl hover:bg-gray-50 transition"
                    >
                      View Financials
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------------------------
            BILL GENERATION MODAL
      ---------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-5 shadow-xl">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCustomer?.name}
              </h2>
              <p className="text-xs text-gray-500">
                Generate bill for selected date range
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                {success}
              </div>
            )}

            {!generatedBill && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={handleGenerateBill}
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Bill"}
                </button>
              </>
            )}

            {generatedBill && (
              <>
                <div className="border-t pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>₹{generatedBill.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>₹{generatedBill.amountPaid}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Pending</span>
                    <span>
                      ₹{generatedBill.totalAmount -
                        generatedBill.amountPaid}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-xl transition"
                >
                  Download PDF
                </button>
              </>
            )}

            <button
              onClick={closeModal}
              className="text-sm text-gray-500 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;