import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import { getCustomersByLane } from "../../api/customer.api";
import {
  getDeliveriesByDateAndLane,
  upsertDeliveryRecord,
  deleteDeliveryRecord,
} from "../../api/deliveryRecord.api";

const DeliveryPage = () => {
  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [customers, setCustomers] = useState([]);
  const [deliveryMap, setDeliveryMap] = useState({});

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
    const laneRes = await getLanes();
    const productRes = await getProducts();
    setLanes(laneRes.data.data);
    setProducts(productRes.data.data);
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

    fetchDeliveries();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Delivery</h1>

      <div className="flex gap-4 my-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2"
        />

        <select
          value={selectedLane}
          onChange={(e) => setSelectedLane(e.target.value)}
          className="border p-2"
        >
          <option value="">Select Lane</option>
          {lanes.map((lane) => (
            <option key={lane._id} value={lane._id}>
              {lane.name}
            </option>
          ))}
        </select>
      </div>

      {customers.map((cust) => (
        <div key={cust._id} className="border p-4 mb-4">
          <h2 className="font-semibold">{cust.name}</h2>

          {cust.productRows
            .filter((row) => !row.isRemoved)
            .map((row, index) => (
              <div key={index} className="flex gap-2 my-2 items-center">
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
                  className="border p-1"
                >
                  <option value="">Select Product</option>
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
                  className="border p-1 w-20"
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
                  className="border p-1 w-20"
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
                  className="border p-1"
                >
                  <option value="DELIVERED">Delivered</option>
                  <option value="NOT_DELIVERED">Not Delivered</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>

                <button
                  onClick={() =>
                    handleRemoveProduct(cust._id, index)
                  }
                  className="bg-red-500 text-white px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}

          <button
            onClick={() => handleAddProduct(cust._id)}
            className="bg-blue-500 text-white px-3 py-1 mt-2"
          >
            + Add Product
          </button>

          <button
            onClick={() => handleCustomerSave(cust)}
            className="bg-green-600 text-white px-4 py-2 mt-2 ml-3"
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
};

export default DeliveryPage;