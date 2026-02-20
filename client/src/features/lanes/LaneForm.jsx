import { useEffect, useState } from "react";
import { createLane, updateLane } from "../../api/lane.api";

const LaneForm = ({ editing, setEditing, refresh, setRefresh, setShowForm }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setShowForm(true);
    }
  }, [editing, setShowForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      await updateLane(editing._id, { name });
      setEditing(null);
    } else {
      await createLane({ name });
    }

    setName("");
    setRefresh(!refresh);
    setShowForm(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Update Lane" : "Add Lane"}
          </h2>
          <p className="text-sm text-gray-500">
            Manage delivery lanes efficiently.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Lane Name</label>
          <input
            type="text"
            placeholder="Enter lane name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
            required
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button className="rounded-xl bg-gray-900 hover:bg-black text-white px-6 py-2.5 text-sm font-medium transition">
            {editing ? "Update Lane" : "Add Lane"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default LaneForm;