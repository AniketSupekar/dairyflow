import { useEffect, useState } from "react";
import { getLanes, deleteLane } from "../../api/lane.api";
import LaneForm from "./LaneForm";
import { Pencil, Trash2, Plus } from "lucide-react";

const LaneList = () => {
  const [lanes, setLanes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchLanes = async () => {
    const res = await getLanes();
    setLanes(res.data.data);
  };

  useEffect(() => {
    fetchLanes();
  }, [refresh]);

  const handleDelete = async (id) => {
    await deleteLane(id);
    setRefresh(!refresh);
  };

  const handleEdit = (lane) => {
    setEditing(lane);
    setShowForm(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Lanes
          </h1>
          <p className="text-sm text-gray-500">
            Manage delivery lanes.
          </p>
        </div>

        <button
          onClick={() => { setEditing(null); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          {showForm ? "Close" : "Add Lane"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <LaneForm
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
          setShowForm={setShowForm}
        />
      )}

      {/* Grid */}
      {lanes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          No lanes found. Add your first lane to get started.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lanes.map((lane) => (
            <div
              key={lane._id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition"
            >

              {/* Lane Name */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {lane.name}
                </h3>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(lane)}
                  className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => handleDelete(lane._id)}
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

export default LaneList;