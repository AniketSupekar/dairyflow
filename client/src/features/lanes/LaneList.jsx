import { useEffect, useState } from "react";
import { getLanes, deleteLane } from "../../api/lane.api";
import LaneForm from "./LaneForm";

const LaneList = () => {
  const [lanes, setLanes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
          Lanes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage delivery lanes efficiently.
        </p>
      </div>

      {/* Form */}
      <LaneForm
        editing={editing}
        setEditing={setEditing}
        refresh={refresh}
        setRefresh={setRefresh}
      />

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {lanes.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            No lanes found. Add your first lane to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-4 font-medium">Lane Name</th>
                  <th className="px-6 py-4 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {lanes.map((lane) => (
                  <tr
                    key={lane._id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {lane.name}
                    </td>

                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => setEditing(lane)}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(lane._id)}
                        className="text-red-500 hover:text-red-600 text-sm font-medium transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LaneList;
