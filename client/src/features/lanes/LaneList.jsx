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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lanes</h1>

      <LaneForm
        editing={editing}
        setEditing={setEditing}
        refresh={refresh}
        setRefresh={setRefresh}
      />

      <table className="w-full mt-6 border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Lane Name</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lanes.map((lane) => (
            <tr key={lane._id}>
              <td className="p-2 border">{lane.name}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => setEditing(lane)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lane._id)}
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

export default LaneList;