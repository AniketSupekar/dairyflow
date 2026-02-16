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

      alert("Payment Added Successfully");
      setAmount("");
    } catch (err) {
      console.error(err);
      alert("Error adding payment");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Add Payment</h2>

      <select
        className="border p-2 mb-3"
        onChange={(e) => handleLaneChange(e.target.value)}
      >
        <option value="">Select Lane</option>
        {lanes.map((lane) => (
          <option key={lane._id} value={lane._id}>
            {lane.name}
          </option>
        ))}
      </select>

      <select
        className="border p-2 mb-3"
        onChange={(e) => setSelectedCustomer(e.target.value)}
      >
        <option value="">Select Customer</option>
        {customers.map((customer) => (
          <option key={customer._id} value={customer._id}>
            {customer.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Amount"
        className="border p-2 mb-3 w-full"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <select
        className="border p-2 mb-3 w-full"
        value={paymentMode}
        onChange={(e) => setPaymentMode(e.target.value)}
      >
        <option value="CASH">Cash</option>
        <option value="UPI">UPI</option>
        <option value="BANK">Bank</option>
        <option value="OTHER">Other</option>
      </select>

      <input
        type="date"
        className="border p-2 mb-3 w-full"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        Save Payment
      </button>
    </div>
  );
};

export default PaymentPage;