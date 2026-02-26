import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "../../api/product.api";
import { Package } from "lucide-react";

const ProductForm = ({ editing, setEditing, refresh, setRefresh, onCancel, onSuccess }) => {
  const [form, setForm] = useState({ name: "", unit: "", rate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({ name: "", unit: "", rate: "" });
  }, [editing]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (editing) {
      await updateProduct(editing._id, form);
      onSuccess?.("Product updated successfully");
      setEditing(null);
    } else {
      await createProduct(form);
      onSuccess?.("Product added successfully");
    }
    setForm({ name: "", unit: "", rate: "" });
    setRefresh(!refresh);
    setLoading(false);
    onCancel?.();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <Package size={13} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          {editing ? "Edit Product" : "New Product"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Full Cream Milk"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={form.unit}
              onChange={handleChange}
              placeholder="litre, packet, kg..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Rate (₹)
            </label>
            <input
              type="number"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
            {loading ? "Saving…" : editing ? "Update" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;