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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
        <input
          type="text"
          name="unit"
          placeholder="Unit (litre, packet)"
          value={form.unit}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
        <input
          type="number"
          name="rate"
          placeholder="Rate"
          value={form.rate}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
        <button className="bg-green-600 text-white px-4 rounded">
          {editing ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;