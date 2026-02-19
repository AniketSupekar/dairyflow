import { useEffect, useState } from "react";
import { getCustomersByLane, generateBill } from "../../api/billing.api";
import { getLanes } from "../../api/lane.api";

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

  useEffect(() => {
    const fetchLanes = async () => {
      const res = await getLanes();
      setLanes(res.data.data);
    };
    fetchLanes();
  }, []);

  const handleLaneChange = async (laneId) => {
    setSelectedLane(laneId);
    if (!laneId) return;
    const res = await getCustomersByLane(laneId);
    setCustomers(res.data.data);
  };

  const openModal = (customer) => {
    setSelectedCustomer(customer);
    setGeneratedBill(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFromDate("");
    setToDate("");
    setGeneratedBill(null);
  };

  const handleGenerateBill = async () => {
    if (!fromDate || !toDate) {
      alert("Select date range");
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
    } catch (err) {
      alert("Error generating bill");
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
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Billing
        </h1>
      </div>

      <div>
        <select
          value={selectedLane}
          onChange={(e) => handleLaneChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select Lane</option>
          {lanes.map((lane) => (
            <option key={lane._id} value={lane._id}>
              {lane.name}
            </option>
          ))}
        </select>
      </div>

      {customers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Opening Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer._id}
                  className="border-t border-gray-100"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    ₹{customer.openingBalance || 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openModal(customer)}
                      className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                    >
                      Generate Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-xl">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCustomer?.name}
              </h2>
              <p className="text-xs text-gray-500">
                Generate Non-GST Bill
              </p>
            </div>

            {!generatedBill && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={handleGenerateBill}
                  disabled={loading}
                  className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg w-full transition"
                >
                  {loading ? "Generating..." : "Generate Bill"}
                </button>
              </>
            )}

            {generatedBill && (
              <div className="space-y-4">

                <div className="max-h-64 overflow-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-center">Rate</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedBill.deliveryItems?.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="p-2">{item.productName}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-center">₹{item.rate}</td>
                          <td className="p-2 text-right font-medium">
                            ₹{item.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-sm space-y-1 border-t pt-3">
                  <div className="flex justify-between">
                    <span>Opening Balance</span>
                    <span>₹{generatedBill.openingBalance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deliveries</span>
                    <span>₹{generatedBill.deliveryTotal}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-1">
                    <span>Total</span>
                    <span>₹{generatedBill.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>₹{generatedBill.amountPaid}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-600 pt-1">
                    <span>Pending</span>
                    <span>
                      ₹{generatedBill.totalAmount - generatedBill.amountPaid}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg w-full transition"
                >
                  Download PDF
                </button>
              </div>
            )}

            <button
              onClick={closeModal}
              className="text-sm text-gray-600 hover:text-black w-full"
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