import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import {
  getCustomersByLane,
  deleteCustomer,
} from "../../api/customer.api";
import CustomerForm from "./CustomerForm";
import { Pencil, Trash2, Plus } from "lucide-react";

const CustomerPage = () => {
  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Customers
        </h1>
        <p className="text-sm text-gray-500">
          Manage customers lane-wise
        </p>
      </div>

      {/* Lane Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-sm text-gray-600 mb-2">
          Select Lane
        </label>
        <select
          className="w-full md:w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
          value={selectedLane}
          onChange={(e) => {
            setSelectedLane(e.target.value);
            setShowForm(false);
            setEditing(null);
          }}
        >
          <option value="">Select Lane</option>
          {lanes.map((lane) => (
            <option key={lane._id} value={lane._id}>
              {lane.name}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Section */}
      {selectedLane && (
        <div className="space-y-6">

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Customers
              </h2>
              <p className="text-sm text-gray-500">
                {customers.length} total
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
            <CustomerForm
              products={products}
              laneId={selectedLane}
              editing={editing}
              setEditing={setEditing}
              refresh={refresh}
              setRefresh={setRefresh}
            />
          )}

          {/* Customer Grid */}
          {customers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
              No customers added yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {customers.map((cust) => (
                <div
                  key={cust._id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition"
                >

                  {/* Left Content */}
                  <div className="space-y-2">

                    <h3 className="text-sm font-semibold text-gray-900">
                      {cust.name}
                    </h3>

                    {cust.subscriptions?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cust.subscriptions.map((sub, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {sub.productId?.name} × {sub.quantity}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        No subscriptions
                      </p>
                    )}

                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-2">

                    <button
                      onClick={() => {
                        setEditing(cust);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(cust._id)}
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
      )}
    </div>
  );
};

export default CustomerPage;