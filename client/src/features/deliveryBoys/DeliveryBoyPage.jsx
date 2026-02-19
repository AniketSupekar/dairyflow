import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import {
  getDeliveryBoys,
  deleteDeliveryBoy,
} from "../../api/deliveryBoy.api";
import DeliveryBoyForm from "./DeliveryBoyForm";
import { Pencil, Trash2, Plus } from "lucide-react";

const DeliveryBoyPage = () => {
  const [lanes, setLanes] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchDeliveryBoys();
  }, [refresh]);

  const fetchInitialData = async () => {
    const laneRes = await getLanes();
    setLanes(laneRes.data.data);
  };

  const fetchDeliveryBoys = async () => {
    const res = await getDeliveryBoys();
    setDeliveryBoys(res.data.data);
  };

  const handleDelete = async (id) => {
    await deleteDeliveryBoy(id);
    setRefresh(!refresh);
  };

  const handleEdit = (boy) => {
    setEditing(boy);
    setShowForm(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Delivery Team
          </h1>
          <p className="text-sm text-gray-500">
            Manage delivery personnel
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
        <DeliveryBoyForm
          lanes={lanes}
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
        />
      )}

      {/* Grid */}
      {deliveryBoys.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          No delivery boys found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {deliveryBoys.map((boy) => (
            <div
              key={boy._id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition"
            >

              {/* Left Content */}
              <div className="space-y-2">

                <h3 className="text-sm font-semibold text-gray-900">
                  {boy.name}
                </h3>

                {boy.assignedLanes?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {boy.assignedLanes.map((lane) => (
                      <span
                        key={lane._id}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {lane.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No lanes assigned
                  </p>
                )}

              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">

                <button
                  onClick={() => handleEdit(boy)}
                  className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(boy._id)}
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

export default DeliveryBoyPage;
