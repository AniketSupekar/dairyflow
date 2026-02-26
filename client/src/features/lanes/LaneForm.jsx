import { useEffect, useState } from "react";
import { createLane, updateLane } from "../../api/lane.api";
import { MapPin } from "lucide-react";

const LaneForm = ({ editing, setEditing, refresh, setRefresh, onCancel, onSuccess }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) setName(editing.name);
    else setName("");
  }, [editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (editing) {
      await updateLane(editing._id, { name });
      onSuccess?.("Lane updated successfully");
      setEditing(null);
    } else {
      await createLane({ name });
      onSuccess?.("Lane added successfully");
    }
    setName("");
    setRefresh(!refresh);
    setLoading(false);
    onCancel?.();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <MapPin size={13} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          {editing ? "Edit Lane" : "New Lane"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="mb-5 space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Lane Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sector 12 North"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
            required
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? "Saving…" : editing ? "Update" : "Add Lane"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LaneForm;