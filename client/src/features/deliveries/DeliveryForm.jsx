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
    <form onSubmit={handleSubmit}>
      <h4>{editingRecord ? "Edit Delivery" : "Add Delivery"}</h4>

      <select
        value={form.customerId}
        onChange={(e) =>
          setForm({ ...form, customerId: e.target.value })
        }
        required
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
      >
        <option value="">Select Product</option>
        {products.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Quantity"
        value={form.quantity}
        onChange={(e) =>
          setForm({ ...form, quantity: e.target.value })
        }
        required
      />

      <input
        type="number"
        placeholder="Rate"
        value={form.rate}
        onChange={(e) =>
          setForm({ ...form, rate: e.target.value })
        }
        required
      />

      <select
        value={form.status}
        onChange={(e) =>
          setForm({ ...form, status: e.target.value })
        }
      >
        <option value="DELIVERED">Delivered</option>
        <option value="NOT_DELIVERED">Not Delivered</option>
        <option value="HOLIDAY">Holiday</option>
      </select>

      <button type="submit">Save</button>
    </form>
  );
};

export default DeliveryForm;