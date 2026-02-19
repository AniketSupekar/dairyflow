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

const DeliveryPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const today = new Date().toISOString().split("T")[0];

  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [date, setDate] = useState(today);
  const [customers, setCustomers] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    if (selectedLane) {
      fetchCustomers();
      fetchDeliveries();
    }
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

  const fetchCustomers = async () => {
    const res = await getCustomersByLane(selectedLane);
    const formatted = res.data.data.map((cust) => ({
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
    setCustomers(formatted);
  };

  const fetchDeliveries = async () => {
    const res = await getDeliveriesByDateAndLane(date, selectedLane);
    const records = res.data.data;

    setCustomers((prev) =>
      prev.map((cust) => {
        const updatedRows = [...cust.productRows];

        records
          .filter((r) => r.customerId._id === cust._id)
          .forEach((rec) => {
            const index = updatedRows.findIndex(
              (row) => row.productId === rec.productId._id
            );

            if (index > -1) {
              updatedRows[index] = {
                ...updatedRows[index],
                quantity: rec.quantity,
                rate: rec.rate,
                status: rec.status,
                recordId: rec._id,
              };
            } else {
              updatedRows.push({
                productId: rec.productId._id,
                productName: rec.productId.name,
                quantity: rec.quantity,
                rate: rec.rate,
                status: rec.status,
                recordId: rec._id,
                isRemoved: false,
              });
            }
          });

        return { ...cust, productRows: updatedRows };
      })
    );
  };

  const handleRowChange = (custId, index, field, value) => {
    setCustomers((prev) =>
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

  const handleAddProduct = (custId) => {
    setCustomers((prev) =>
      prev.map((cust) =>
        cust._id === custId
          ? {
              ...cust,
              productRows: [
                ...cust.productRows,
                {
                  productId: "",
                  productName: "",
                  quantity: 0,
                  rate: 0,
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

  const handleRemoveProduct = (custId, index) => {
    setCustomers((prev) =>
      prev.map((cust) =>
        cust._id === custId
          ? {
              ...cust,
              productRows: cust.productRows.map((row, i) =>
                i === index ? { ...row, isRemoved: true } : row
              ),
            }
          : cust
      )
    );
  };

  const handleCustomerSave = async (cust) => {
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

    await fetchDeliveries();

    setSuccessMessage("Delivery record saved successfully");

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          Delivery
        </h1>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-3">

        {isAdmin && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}

        {(isAdmin || lanes.length > 1) && (
          <select
            value={selectedLane}
            onChange={(e) => setSelectedLane(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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

      <div className="space-y-4">

        {customers.map((cust) => (
          <div
            key={cust._id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
          >

            <h2 className="text-sm font-semibold text-gray-900">
              {cust.name}
            </h2>

            <div className="space-y-3">

              {cust.productRows
                .filter((row) => !row.isRemoved)
                .map((row, index) => (
                  <div
                    key={index}
                    className="grid md:grid-cols-5 gap-2 items-center"
                  >
                    <select
                      value={row.productId}
                      onChange={(e) =>
                        handleRowChange(
                          cust._id,
                          index,
                          "productId",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">Product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) =>
                        handleRowChange(
                          cust._id,
                          index,
                          "quantity",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />

                    <input
                      type="number"
                      value={row.rate}
                      onChange={(e) =>
                        handleRowChange(
                          cust._id,
                          index,
                          "rate",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />

                    <select
                      value={row.status}
                      onChange={(e) =>
                        handleRowChange(
                          cust._id,
                          index,
                          "status",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      <option value="DELIVERED">Delivered</option>
                      <option value="NOT_DELIVERED">Not Delivered</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>

                    <button
                      onClick={() =>
                        handleRemoveProduct(cust._id, index)
                      }
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}

            </div>

            <div className="flex flex-wrap gap-3 pt-2">

              <button
                onClick={() => handleAddProduct(cust._id)}
                className="text-xs font-medium text-gray-700 hover:text-black"
              >
                + Add Product
              </button>

              <button
                onClick={() => handleCustomerSave(cust)}
                className="bg-gray-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition"
              >
                Save
              </button>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
};

export default DeliveryPage;