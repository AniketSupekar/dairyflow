import { useEffect, useState } from "react";
import { createCustomer, updateCustomer } from "../../api/customer.api";

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
    const updated = form.subscriptions.filter((_, i) => i !== index);
    setForm({ ...form, subscriptions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form, laneId };

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
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {editing ? "Edit Customer" : "Add Customer"}
        </h2>
        <p className="text-sm text-gray-500">
          Manage customer details and subscriptions.
        </p>
      </div>

      {/* Basic Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Name
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm transition"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Phone
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm transition"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">
            Address
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm transition"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />
        </div>
      </div>

      {/* Subscriptions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">
            Subscriptions
          </h3>
          <button
            type="button"
            onClick={addSubscription}
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            + Add Product
          </button>
        </div>

        <div className="space-y-3">
          {form.subscriptions.map((sub, index) => (
            <div
              key={index}
              className="grid md:grid-cols-3 gap-3 items-end bg-gray-50 rounded-xl p-4"
            >
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Product
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
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
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
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
                </div>

                <button
                  type="button"
                  onClick={() => removeSubscription(index)}
                  className="text-red-500 text-sm font-medium hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opening Balance */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Opening Balance
        </label>
        <input
          type="number"
          className="w-full rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm transition"
          value={form.openingBalance}
          onChange={(e) =>
            setForm({
              ...form,
              openingBalance: e.target.value,
            })
          }
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-medium px-6 py-2.5 transition"
        >
          {editing ? "Update Customer" : "Add Customer"}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;