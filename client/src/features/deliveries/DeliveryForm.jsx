import { useEffect, useState } from "react";
import { upsertDeliveryRecord } from "../../api/deliveryRecord.api";
import axios from "../../api/axios";

const DeliveryForm = ({ date, editingRecord, onSuccess }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    quantity: "",
    rate: "",
    status: "DELIVERED",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (editingRecord) {
      setForm({
        customerId: editingRecord.customerId._id,
        productId: editingRecord.productId._id,
        quantity: editingRecord.quantity,
        rate: editingRecord.rate,
        status: editingRecord.status,
      });
    }
  }, [editingRecord]);

  const fetchInitialData = async () => {
    const customerRes = await axios.get("/customers");
    const productRes = await axios.get("/products");
    setCustomers(customerRes.data.data);
    setProducts(productRes.data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await upsertDeliveryRecord({
      ...form,
      date,
    });

    setForm({
      customerId: "",
      productId: "",
      quantity: "",
      rate: "",
      status: "DELIVERED",
    });

    onSuccess();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">
        {editingRecord ? "Edit Delivery" : "Add Delivery"}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">

        <select
          value={form.customerId}
          onChange={(e) =>
            setForm({ ...form, customerId: e.target.value })
          }
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
        >
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={form.productId}
          onChange={(e) =>
            setForm({ ...form, productId: e.target.value })
          }
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) =>
              setForm({ ...form, quantity: e.target.value })
            }
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
          />

          <input
            type="number"
            placeholder="Rate"
            value={form.rate}
            onChange={(e) =>
              setForm({ ...form, rate: e.target.value })
            }
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
          />
        </div>

        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
        >
          <option value="DELIVERED">Delivered</option>
          <option value="NOT_DELIVERED">Not Delivered</option>
          <option value="HOLIDAY">Holiday</option>
        </select>

        <button
          type="submit"
          className="w-full bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-lg transition"
        >
          Save
        </button>

      </form>
    </div>
  );
};

export default DeliveryForm;