import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "../../api/product.api";

const ProductForm = ({ editing, setEditing, refresh, setRefresh }) => {
  const [form, setForm] = useState({
    name: "",
    unit: "",
    rate: "",
  });

  useEffect(() => {
    if (editing) {
      setForm(editing);
    }
  }, [editing]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      await updateProduct(editing._id, form);
      setEditing(null);
    } else {
      await createProduct(form);
    }

    setForm({ name: "", unit: "", rate: "" });
    setRefresh(!refresh);
  };

  return (
    <form className="bg-white border border-gray-200 rounded-xl p-6 space-y-4" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-3 gap-4">

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Product Name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter product name"
            className="w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3 py-2 text-sm transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Unit
          </label>
          <input
            type="text"
            name="unit"
            value={form.unit}
            onChange={handleChange}
            placeholder="litre, packet..."
            className="w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3 py-2 text-sm transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Rate
          </label>
          <input
            type="number"
            name="rate"
            value={form.rate}
            onChange={handleChange}
            placeholder="Enter rate"
            className="w-full rounded-lg border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3 py-2 text-sm transition"
            required
          />
        </div>

      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {editing ? "Update Product" : "Add Product"}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;