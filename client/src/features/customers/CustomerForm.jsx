import { useEffect, useState } from "react";
import {
  createCustomer,
  updateCustomer,
} from "../../api/customer.api";

const CustomerForm = ({
  products,
  laneId,
  editing,
  setEditing,
  refresh,
  setRefresh,
}) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    subscriptions: [{ productId: "", quantity: 1 }],
    openingBalance: 0,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        address: editing.address,
        subscriptions: editing.subscriptions,
        openingBalance: editing.openingBalance || 0,
      });
    }
  }, [editing]);

  const handleSubscriptionChange = (index, field, value) => {
    const updated = [...form.subscriptions];
    updated[index][field] = value;
    setForm({ ...form, subscriptions: updated });
  };

  const addSubscription = () => {
    setForm({
      ...form,
      subscriptions: [
        ...form.subscriptions,
        { productId: "", quantity: 1 },
      ],
    });
  };

  const removeSubscription = (index) => {
    const updated = form.subscriptions.filter(
      (_, i) => i !== index
    );
    setForm({ ...form, subscriptions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      laneId,
    };

    if (editing) {
      await updateCustomer(editing._id, payload);
      setEditing(null);
    } else {
      await createCustomer(payload);
    }

    setForm({
      name: "",
      phone: "",
      address: "",
      subscriptions: [{ productId: "", quantity: 1 }],
      openingBalance: 0,
    });

    setRefresh(!refresh);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-4">
      <input
        type="text"
        placeholder="Name"
        className="border p-2 w-full"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
        required
      />

      <input
        type="text"
        placeholder="Phone"
        className="border p-2 w-full"
        value={form.phone}
        onChange={(e) =>
          setForm({ ...form, phone: e.target.value })
        }
      />

      <input
        type="text"
        placeholder="Address"
        className="border p-2 w-full"
        value={form.address}
        onChange={(e) =>
          setForm({ ...form, address: e.target.value })
        }
      />

      <div>
        <h3 className="font-semibold">Subscriptions</h3>
        {form.subscriptions.map((sub, index) => (
          <div key={index} className="flex gap-2 mt-2">
            <select
              className="border p-2"
              value={sub.productId}
              onChange={(e) =>
                handleSubscriptionChange(
                  index,
                  "productId",
                  e.target.value
                )
              }
              required
            >
              <option value="">Select Product</option>
              {products.map((prod) => (
                <option key={prod._id} value={prod._id}>
                  {prod.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="border p-2 w-24"
              value={sub.quantity}
              onChange={(e) =>
                handleSubscriptionChange(
                  index,
                  "quantity",
                  e.target.value
                )
              }
              required
            />

            <button
              type="button"
              onClick={() => removeSubscription(index)}
              className="bg-red-500 text-white px-2"
            >
              X
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addSubscription}
          className="bg-green-600 text-white px-3 py-1 mt-2"
        >
          Add Product
        </button>
      </div>

      <input
        type="number"
        placeholder="Opening Balance"
        className="border p-2 w-full"
        value={form.openingBalance}
        onChange={(e) =>
          setForm({
            ...form,
            openingBalance: e.target.value,
          })
        }
      />

      <button className="bg-blue-600 text-white px-4 py-2">
        {editing ? "Update Customer" : "Add Customer"}
      </button>
    </form>
  );
};

export default CustomerForm;