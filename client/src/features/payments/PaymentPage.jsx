import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import { getCustomersByLane } from "../../api/billing.api";
import { createPayment } from "../../api/payment.api";

const PaymentPage = () => {
  const [lanes, setLanes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [date, setDate] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchLanes = async () => {
      const res = await getLanes();
      setLanes(res.data.data);
    };
    fetchLanes();
  }, []);

  const handleLaneChange = async (laneId) => {
    setSelectedLane(laneId);
    setSelectedCustomer("");
    if (!laneId) return;
    const res = await getCustomersByLane(laneId);
    setCustomers(res.data.data);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount || !date) {
      alert("Fill all fields");
      return;
    }

    try {
      await createPayment({
        customerId: selectedCustomer,
        amount,
        paymentMode,
        date,
      });

      setSuccessMessage("Payment added successfully");

      setAmount("");
      setDate("");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Error adding payment");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Add Payment
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Record customer payment transaction
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">

        {/* Lane Selection */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Lane
          </label>
          <select
            value={selectedLane}
            onChange={(e) => handleLaneChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Select Lane</option>
            {lanes.map((lane) => (
              <option key={lane._id} value={lane._id}>
                {lane.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Selection */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Customer
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Amount
          </label>
          <input
            type="number"
            placeholder="Enter amount"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Payment Mode */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Payment Mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK">Bank</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Payment Date
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-lg transition"
        >
          Save Payment
        </button>

      </div>
    </div>
  );
};

export default PaymentPage;