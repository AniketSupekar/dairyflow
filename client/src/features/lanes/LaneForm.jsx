import { useEffect, useState } from "react";
import { createLane, updateLane } from "../../api/lane.api";

const LaneForm = ({ editing, setEditing, refresh, setRefresh }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
    }
  }, [editing]);

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
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
    >
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Lane Name
          </label>
          <input
            type="text"
            placeholder="Enter lane name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-4 py-2.5 text-sm transition"
            required
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-medium px-6 py-2.5 transition-all duration-200"
        >
          {editing ? "Update Lane" : "Add Lane"}
        </button>
      </div>
    </form>
  );
};

export default LaneForm;