import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import { getCustomersByLane } from "../../api/customer.api";
import {
  getDeliveriesByDateAndLane,
  upsertDeliveryRecord,
  deleteDeliveryRecord,
} from "../../api/deliveryRecord.api";
import { Pencil, Trash2, Plus, X } from "lucide-react";

const DeliveryPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const today = new Date().toISOString().split("T")[0];

  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [date, setDate] = useState(today);

  const [addedCustomers, setAddedCustomers] = useState([]);
  const [remainingCustomers, setRemainingCustomers] = useState([]);

  const [isAddMode, setIsAddMode] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    if (selectedLane) loadData();
  }, [selectedLane, date]);

  const fetchInitial = async () => {
    const productRes = await getProducts();
    setProducts(productRes.data.data);

    if (isAdmin) {
      const laneRes = await getLanes();
      setLanes(laneRes.data.data);
    } else {
      const assigned = user.assignedLanes || [];
      const formatted = assigned.map((laneId) => ({
        _id: laneId,
        name: "Assigned Lane",
      }));
      setLanes(formatted);
      if (formatted.length > 0) {
        setSelectedLane(formatted[0]._id);
      }
    }
  };

  const loadData = async () => {
    const custRes = await getCustomersByLane(selectedLane);
    const customers = custRes.data.data;

    const deliveryRes = await getDeliveriesByDateAndLane(date, selectedLane);
    const records = deliveryRes.data.data;

    const recordedCustomerIds = [
      ...new Set(records.map((r) => r.customerId._id)),
    ];

    const added = customers
      .filter((cust) => recordedCustomerIds.includes(cust._id))
      .map((cust) => ({
        ...cust,
        productRows: records
          .filter((r) => r.customerId._id === cust._id)
          .map((rec) => ({
            productId: rec.productId._id,
            productName: rec.productId.name,
            quantity: rec.quantity,
            rate: rec.rate,
            status: rec.status,
            recordId: rec._id,
            isRemoved: false,
          })),
      }));

    const remaining = customers
      .filter((cust) => !recordedCustomerIds.includes(cust._id))
      .map((cust) => ({
        ...cust,
        productRows: cust.subscriptions.map((sub) => ({
          productId: sub.productId._id,
          productName: sub.productId.name,
          quantity: sub.quantity,
          rate: sub.productId.rate,
          status: "DELIVERED",
          recordId: null,
          isRemoved: false,
        })),
      }));

    setAddedCustomers(added);
    setRemainingCustomers(remaining);
    setEditingCustomerId(null);
  };

  const handleRowChange = (custId, index, field, value, type) => {
    const setter =
      type === "added" ? setAddedCustomers : setRemainingCustomers;

    setter((prev) =>
      prev.map((cust) =>
        cust._id === custId
          ? {
              ...cust,
              productRows: cust.productRows.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
              ),
            }
          : cust
      )
    );
  };

  const addProductRow = (custId, type) => {
    const setter =
      type === "added" ? setAddedCustomers : setRemainingCustomers;

    setter((prev) =>
      prev.map((cust) =>
        cust._id === custId
          ? {
              ...cust,
              productRows: [
                ...cust.productRows,
                {
                  productId: products[0]?._id,
                  productName: products[0]?.name,
                  quantity: 1,
                  rate: products[0]?.rate || 0,
                  status: "DELIVERED",
                  recordId: null,
                  isRemoved: false,
                },
              ],
            }
          : cust
      )
    );
  };

  const removeRow = (custId, index, type) => {
    const setter =
      type === "added" ? setAddedCustomers : setRemainingCustomers;

    setter((prev) =>
      prev.map((cust) =>
        cust._id === custId
          ? {
              ...cust,
              productRows:
                type === "added"
                  ? cust.productRows.map((row, i) =>
                      i === index ? { ...row, isRemoved: true } : row
                    )
                  : cust.productRows.filter((_, i) => i !== index),
            }
          : cust
      )
    );
  };

  const handleCustomerSave = async (cust, type) => {
    for (const row of cust.productRows) {
      if (row.isRemoved && row.recordId) {
        await deleteDeliveryRecord(row.recordId);
        continue;
      }

      if (!row.isRemoved && row.productId) {
        await upsertDeliveryRecord({
          customerId: cust._id,
          productId: row.productId,
          quantity: Number(row.quantity),
          rate: Number(row.rate),
          status: row.status,
          date,
        });
      }
    }

    await loadData();
    setSuccessMessage("Delivery record saved successfully");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm("Are you sure you want to delete this delivery record?")) return;

    for (const row of cust.productRows) {
      if (row.recordId) await deleteDeliveryRecord(row.recordId);
    }

    await loadData();
  };

  const renderCustomerCard = (cust, type) => {
    const isEditing = editingCustomerId === cust._id;

    return (
      <div
        key={cust._id}
        className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">{cust.name}</h3>

          {type === "added" && (
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setEditingCustomerId(isEditing ? null : cust._id)
                }
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <Pencil size={16} />
              </button>

              <button
                onClick={() => handleDeleteCustomer(cust)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-md"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {cust.productRows
          .filter((r) => !r.isRemoved)
          .map((row, index) =>
            isEditing || type === "remaining" ? (
              <div key={index} className="space-y-2 text-xs">
                <select
                  value={row.productId}
                  onChange={(e) =>
                    handleRowChange(
                      cust._id,
                      index,
                      "productId",
                      e.target.value,
                      type
                    )
                  }
                  className="w-full border rounded-lg px-2 py-1.5"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) =>
                      handleRowChange(
                        cust._id,
                        index,
                        "quantity",
                        e.target.value,
                        type
                      )
                    }
                    className="border rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="number"
                    value={row.rate}
                    onChange={(e) =>
                      handleRowChange(
                        cust._id,
                        index,
                        "rate",
                        e.target.value,
                        type
                      )
                    }
                    className="border rounded-lg px-2 py-1.5"
                  />
                  <select
                    value={row.status}
                    onChange={(e) =>
                      handleRowChange(
                        cust._id,
                        index,
                        "status",
                        e.target.value,
                        type
                      )
                    }
                    className="border rounded-lg px-2 py-1.5"
                  >
                    <option value="DELIVERED">Delivered</option>
                    <option value="NOT_DELIVERED">Not Delivered</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>

                <button
                  onClick={() => removeRow(cust._id, index, type)}
                  className="text-red-500 text-xs flex items-center gap-1"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <div
                key={index}
                className="flex justify-between text-xs text-gray-600"
              >
                <div>
                  <div>{row.productName}</div>
                  <div className="text-[10px] text-gray-400">
                    Status: {row.status}
                  </div>
                </div>
                <div>
                  {row.quantity} × ₹{row.rate}
                </div>
              </div>
            )
          )}

        {(isEditing || type === "remaining") && (
          <>
            <button
              onClick={() => addProductRow(cust._id, type)}
              className="text-xs text-gray-600 flex items-center gap-1"
            >
              <Plus size={14} /> Add Product
            </button>

            <button
              onClick={() => handleCustomerSave(cust, type)}
              className="bg-gray-900 text-white rounded-lg px-4 py-2 text-xs"
            >
              Save
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Delivery Records</h1>

        <button
          onClick={() => setIsAddMode(!isAddMode)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          {isAddMode ? "Close" : "Add"}
        </button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="flex gap-3">
        {isAdmin && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm"
          />
        )}

        {(isAdmin || lanes.length > 1) && (
          <select
            value={selectedLane}
            onChange={(e) => setSelectedLane(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm"
          >
            <option value="">Select Lane</option>
            {lanes.map((lane) => (
              <option key={lane._id} value={lane._id}>
                {lane.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAddMode
          ? remainingCustomers.map((cust) =>
              renderCustomerCard(cust, "remaining")
            )
          : addedCustomers.map((cust) =>
              renderCustomerCard(cust, "added")
            )}
      </div>
    </div>
  );
};

export default DeliveryPage;