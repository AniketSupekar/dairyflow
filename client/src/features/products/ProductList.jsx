import { useEffect, useState } from "react";
import { getProducts, deleteProduct } from "../../api/product.api";
import ProductForm from "./ProductForm";
import { Pencil, Trash2, Plus } from "lucide-react";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [refresh]);

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data.data);
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirm) return;

    await deleteProduct(id);
    setRefresh(!refresh);
  };

  const handleEdit = (product) => {
    setEditing(product);
    setShowForm(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Products
          </h1>
          <p className="text-sm text-gray-500">
            Manage dairy products
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          {showForm ? "Close" : "Add"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <ProductForm
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
        />
      )}

      {/* Grid */}
      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          No products found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition"
            >

              {/* Left Content */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {product.name}
                </h3>

                <p className="text-xs text-gray-500">
                  Unit: {product.unit}
                </p>

                <p className="text-xs font-medium text-gray-700">
                  ₹ {product.rate}
                </p>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">

                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(product._id)}
                  className="p-2 rounded-md hover:bg-red-50 transition text-red-500"
                >
                  <Trash2 size={16} />
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
};

export default ProductList;