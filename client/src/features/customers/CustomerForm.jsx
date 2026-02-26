import { useEffect, useState } from "react";
import { createCustomer, updateCustomer } from "../../api/customer.api";
import { Users, Plus, X } from "lucide-react";

const CustomerForm = ({
  products,
  laneId,
  editing,
  setEditing,
  refresh,
  setRefresh,
  onCancel,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    subscriptions: [{ productId: "", quantity: 1 }],
    openingBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        address: editing.address,
        subscriptions: editing.subscriptions,
        openingBalance: editing.openingBalance || 0,
      });
    } else {
      setForm({
        name: "",
        phone: "",
        address: "",
        subscriptions: [{ productId: "", quantity: 1 }],
        openingBalance: 0,
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
      subscriptions: [...form.subscriptions, { productId: "", quantity: 1 }],
    });
  };

  const removeSubscription = (index) => {
    const updated = form.subscriptions.filter((_, i) => i !== index);
    setForm({ ...form, subscriptions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, laneId };
    if (editing) {
      await updateCustomer(editing._id, payload);
      onSuccess?.("Customer updated successfully");
      setEditing(null);
    } else {
      await createCustomer(payload);
      onSuccess?.("Customer added successfully");
    }
    setForm({
      name: "",
      phone: "",
      address: "",
      subscriptions: [{ productId: "", quantity: 1 }],
      openingBalance: 0,
    });
    setRefresh(!refresh);
    setLoading(false);
    onCancel?.();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Form header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <Users size={13} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          {editing ? "Edit Customer" : "New Customer"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Basic info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Customer name"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opening Balance (₹)</label>
            <input
              type="number"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              placeholder="0"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
            />
          </div>
        </div>

        {/* Subscriptions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscriptions</label>
            <button
              type="button"
              onClick={addSubscription}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 transition"
            >
              <Plus size={13} /> Add Product
            </button>
          </div>

          <div className="space-y-2">
            {form.subscriptions.map((sub, index) => (
              <div key={index} className="flex items-end gap-2 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Product</label>
                  <select
                    value={sub.productId}
                    onChange={(e) => handleSubscriptionChange(index, "productId", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((prod) => (
                      <option key={prod._id} value={prod._id}>{prod.name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-20 space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Qty</label>
                  <input
                    type="number"
                    value={sub.quantity}
                    onChange={(e) => handleSubscriptionChange(index, "quantity", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    required
                    min="1"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeSubscription(index)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? "Saving…" : editing ? "Update" : "Add Customer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;