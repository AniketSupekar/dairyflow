import { useEffect, useState } from "react";
import { createDeliveryBoy, updateDeliveryBoy } from "../../api/deliveryBoy.api";
import { Truck } from "lucide-react";

const DeliveryBoyForm = ({
  lanes,
  editing,
  setEditing,
  refresh,
  setRefresh,
  onCancel,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    assignedLanes: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        password: "",
        assignedLanes: editing.assignedLanes.map((lane) => lane._id),
      });
    } else {
      setForm({ name: "", phone: "", password: "", assignedLanes: [] });
    }
  }, [editing]);

  const handleLaneToggle = (laneId) => {
    setForm((prev) => ({
      ...prev,
      assignedLanes: prev.assignedLanes.includes(laneId)
        ? prev.assignedLanes.filter((id) => id !== laneId)
        : [...prev.assignedLanes, laneId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (editing) {
      await updateDeliveryBoy(editing._id, {
        name: form.name,
        phone: form.phone,
        assignedLanes: form.assignedLanes,
      });
      onSuccess?.("Delivery boy updated successfully");
      setEditing(null);
    } else {
      await createDeliveryBoy(form);
      onSuccess?.("Delivery boy added successfully");
    }
    setForm({ name: "", phone: "", password: "", assignedLanes: [] });
    setRefresh(!refresh);
    setLoading(false);
    onCancel?.();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
          <Truck size={13} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          {editing ? "Edit Delivery Boy" : "New Delivery Boy"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
              required
            />
          </div>

          {!editing && (
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Set login password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition"
                required
              />
            </div>
          )}
        </div>

        {/* Lane assignment */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign Lanes</label>
          {lanes.length === 0 ? (
            <p className="text-xs text-gray-400">No lanes available. Add lanes first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lanes.map((lane) => {
                const selected = form.assignedLanes.includes(lane._id);
                return (
                  <button
                    type="button"
                    key={lane._id}
                    onClick={() => handleLaneToggle(lane._id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      selected
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {lane.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
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
            {loading ? "Saving…" : editing ? "Update" : "Add Delivery Boy"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryBoyForm;