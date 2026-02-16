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
      console.error(err);
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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Billing</h2>

      <select
        className="border p-2 mb-4"
        onChange={(e) => handleLaneChange(e.target.value)}
      >
        <option value="">Select Lane</option>
        {lanes.map((lane) => (
          <option key={lane._id} value={lane._id}>
            {lane.name}
          </option>
        ))}
      </select>

      {customers.length > 0 && (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Opening Balance</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id}>
                <td className="p-2 border">{customer.name}</td>
                <td className="p-2 border">
                  ₹{customer.openingBalance || 0}
                </td>
                <td className="p-2 border">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => openModal(customer)}
                  >
                    Generate Bill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h3 className="text-lg font-bold mb-4">
              {selectedCustomer?.name}
            </h3>

            {!generatedBill && (
              <>
                <input
                  type="date"
                  className="border p-2 w-full mb-3"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  type="date"
                  className="border p-2 w-full mb-3"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <button
                  onClick={handleGenerateBill}
                  disabled={loading}
                  className="bg-green-600 text-white px-3 py-1 rounded w-full"
                >
                  {loading ? "Generating..." : "Generate"}
                </button>
              </>
            )}

            {generatedBill && (
              <>
                <div className="mt-3 text-sm max-h-60 overflow-auto">
                  <table className="w-full border text-xs">
                    <thead>
                      <tr>
                        <th className="border p-1">Date</th>
                        <th className="border p-1">Product</th>
                        <th className="border p-1">Qty</th>
                        <th className="border p-1">Rate</th>
                        <th className="border p-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedBill.deliveryItems?.map((item, index) => (
                        <tr key={index}>
                          <td className="border p-1">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="border p-1">{item.productName}</td>
                          <td className="border p-1">{item.quantity}</td>
                          <td className="border p-1">{item.rate}</td>
                          <td className="border p-1">{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <hr className="my-2" />

                  <p>Opening: ₹{generatedBill.openingBalance}</p>
                  <p>Deliveries: ₹{generatedBill.deliveryTotal}</p>
                  <p>Total: ₹{generatedBill.totalAmount}</p>
                  <p>Paid: ₹{generatedBill.amountPaid}</p>
                  <p className="font-bold">
                    Pending: ₹{generatedBill.totalAmount - generatedBill.amountPaid}
                  </p>

                </div>

                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-3 py-1 rounded w-full mt-3"
                >
                  Download PDF
                </button>
              </>
            )}


            <button
              onClick={closeModal}
              className="bg-gray-400 text-white px-3 py-1 rounded w-full mt-3"
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