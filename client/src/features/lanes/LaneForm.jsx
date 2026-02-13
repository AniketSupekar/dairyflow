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
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        placeholder="Lane Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full"
        required
      />
      <button className="bg-green-600 text-white px-4 rounded">
        {editing ? "Update" : "Add"}
      </button>
    </form>
  );
};

export default LaneForm;