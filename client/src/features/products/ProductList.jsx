import { useEffect, useState } from "react";
import { getProducts, deleteProduct } from "../../api/product.api";
import ProductForm from "./ProductForm";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

  const fetchProducts = async () => {
    const res = await getProducts();
    setProducts(res.data.data);
  };

  useEffect(() => {
    fetchProducts();
  }, [refresh]);

  const handleDelete = async (id) => {
    await deleteProduct(id);
    setRefresh(!refresh);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      <ProductForm
        editing={editing}
        setEditing={setEditing}
        refresh={refresh}
        setRefresh={setRefresh}
      />

      <table className="w-full mt-6 border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Unit</th>
            <th className="p-2 border">Rate</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.unit}</td>
              <td className="p-2 border">₹ {p.rate}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => setEditing(p)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;