import { useEffect, useState } from "react";
import { getProducts, deleteProduct } from "../../api/product.api";
import ProductForm from "./ProductForm";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { Pencil, Trash2, Plus, Package, Tag, Layers } from "lucide-react";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toasts, toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [refresh]);

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setDeletingId(id);
    await deleteProduct(id);
    setDeletingId(null);
    setRefresh(!refresh);
    toast({ message: "Product deleted", type: "success" });
  };

  const handleEdit = (product) => {
    setEditing(product);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleAddNew = () => {
    setEditing(null);
    setShowForm((prev) => !prev);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Products</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage dairy products and pricing</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} strokeWidth={2.5} />
          {showForm && !editing ? "Cancel" : "Add Product"}
        </button>
      </div>

      {/* 2 stat cards */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Layers size={14} />}
            label="Total Products"
            value={products.length}
          />
          <StatCard
            icon={<Tag size={14} />}
            label="Avg. Rate"
            value={`₹${(products.reduce((s, p) => s + p.rate, 0) / products.length).toFixed(0)}`}
          />
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <ProductForm
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
          onCancel={handleCloseForm}
          onSuccess={(msg) => toast({ message: msg, type: "success" })}
        />
      )}

      {/* Empty state */}
      {products.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Package size={20} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">No products yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first product to get started</p>
          </div>
          <button
            onClick={handleAddNew}
            className="mt-1 inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            <Plus size={13} /> Add Product
          </button>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition"
            >
              {/* Left */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                    {product.unit}
                  </span>
                  <span className="text-xs font-bold text-gray-800">₹{product.rate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                <button
                  onClick={() => handleEdit(product)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(product._id)}
                  disabled={deletingId === product._id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Toast toasts={toasts} />

    </div>
  );
};

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default ProductList;