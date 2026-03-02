import { useEffect, useState } from "react";
import {
  getProducts,
  getInactiveProducts,
  deleteProduct,
  restoreProduct,
} from "../../api/product.api";
import ProductForm from "./ProductForm";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { Pencil, Trash2, Plus, Package, Tag, Layers, FolderX, RotateCcw } from "lucide-react";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [inactiveProducts, setInactiveProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const { toasts, toast } = useToast();

  useEffect(() => { fetchProducts(); fetchInactive(); }, [refresh]);

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data.data);
  };

  const fetchInactive = async () => {
    const res = await getInactiveProducts();
    setInactiveProducts(res.data.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this product?")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setRefresh(!refresh);
      toast({ message: "Product deactivated", type: "success" });
    } catch (err) {
      toast({ message: err?.response?.data?.message || "Failed to deactivate product", type: "error" });
    }
    setDeletingId(null);
  };

  const handleRestore = async (id) => {
    setRestoringId(id);
    try {
      await restoreProduct(id);
      setRefresh(!refresh);
      toast({ message: "Product restored successfully", type: "success" });
    } catch (err) {
      toast({ message: "Failed to restore product", type: "error" });
    }
    setRestoringId(null);
  };

  const handleEdit = (product) => { setEditing(product); setShowForm(true); };
  const handleCloseForm = () => { setShowForm(false); setEditing(null); };
  const handleAddNew = () => { setEditing(null); setShowForm((p) => !p); };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage products and rates</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} strokeWidth={2.5} />
          {showForm && !editing ? "Cancel" : "Add Product"}
        </button>
      </div>

      {/* Stat cards */}
      {!showForm && (products.length > 0 || inactiveProducts.length > 0) && (
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <StatCard icon={<Package size={14} />} label="Active" value={products.length} />
          <StatCard
            icon={<FolderX size={14} />}
            label="Inactive"
            value={inactiveProducts.length}
            clickable
            highlighted={showInactive}
            onClick={() => setShowInactive((p) => !p)}
          />
        </div>
      )}

      {/* Inactive panel */}
      {showInactive && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderX size={15} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Inactive Products</h3>
              <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {inactiveProducts.length}
              </span>
            </div>
            <button
              onClick={() => setShowInactive(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition"
            >
              Close
            </button>
          </div>

          {inactiveProducts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-gray-500">No inactive products</p>
              <p className="text-xs text-gray-400 mt-1">Deactivated products will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {inactiveProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={13} className="text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-600 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400">₹{product.rate} / {product.unit}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(product._id)}
                    disabled={restoringId === product._id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition disabled:opacity-40 flex-shrink-0 ml-3"
                  >
                    <RotateCcw size={12} />
                    {restoringId === product._id ? "Restoring…" : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
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
      {!showForm && products.length === 0 && (
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
      )}

      {/* Active grid */}
      {!showForm && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package size={14} className="text-gray-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
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
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Rate + unit pills */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                  <Tag size={11} />
                  ₹{product.rate}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-100">
                  <Layers size={11} />
                  {product.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
};

function StatCard({ icon, label, value, onClick, clickable, highlighted }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition
        ${clickable ? "cursor-pointer hover:border-gray-300 hover:shadow-sm" : ""}
        ${highlighted ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}
      `}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${highlighted ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}
      `}>
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