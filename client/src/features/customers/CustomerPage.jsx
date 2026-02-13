import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import {
  getCustomersByLane,
  deleteCustomer,
} from "../../api/customer.api";
import CustomerForm from "./CustomerForm";

const CustomerPage = () => {
  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLane) {
      fetchCustomers();
    }
  }, [selectedLane, refresh]);

  const fetchInitialData = async () => {
    const laneRes = await getLanes();
    const productRes = await getProducts();

    setLanes(laneRes.data.data);
    setProducts(productRes.data.data);
  };

  const fetchCustomers = async () => {
    const res = await getCustomersByLane(selectedLane);
    setCustomers(res.data.data);
  };

  const handleDelete = async (id) => {
    await deleteCustomer(id);
    setRefresh(!refresh);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>

      {/* Lane Selector */}
      <select
        className="border p-2 mb-4"
        value={selectedLane}
        onChange={(e) => setSelectedLane(e.target.value)}
      >
        <option value="">Select Lane</option>
        {lanes.map((lane) => (
          <option key={lane._id} value={lane._id}>
            {lane.name}
          </option>
        ))}
      </select>

      {selectedLane && (
        <>
          <CustomerForm
            products={products}
            laneId={selectedLane}
            editing={editing}
            setEditing={setEditing}
            refresh={refresh}
            setRefresh={setRefresh}
          />

          <table className="w-full mt-6 border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Name</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Products</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust._id}>
                  <td className="border p-2">{cust.name}</td>
                  <td className="border p-2">{cust.phone}</td>
                  <td className="border p-2">
                    {cust.subscriptions.map((sub, i) => (
                      <div key={i}>
                        {sub.productId?.name} ({sub.quantity})
                      </div>
                    ))}
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => setEditing(cust)}
                      className="bg-blue-500 text-white px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cust._id)}
                      className="bg-red-500 text-white px-2 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default CustomerPage;