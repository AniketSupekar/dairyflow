import { useEffect, useState } from "react";
import {
  createDeliveryBoy,
  updateDeliveryBoy,
} from "../../api/deliveryBoy.api";

const DeliveryBoyForm = ({
  lanes,
  editing,
  setEditing,
  refresh,
  setRefresh,
}) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    assignedLanes: [],
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        phone: editing.phone,
        password: "",
        assignedLanes: editing.assignedLanes.map(
          (lane) => lane._id
        ),
      });
    }
  }, [editing]);

  const handleLaneChange = (laneId) => {
    const exists = form.assignedLanes.includes(laneId);

    if (exists) {
      setForm({
        ...form,
        assignedLanes: form.assignedLanes.filter(
          (id) => id !== laneId
        ),
      });
    } else {
      setForm({
        ...form,
        assignedLanes: [...form.assignedLanes, laneId],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      await updateDeliveryBoy(editing._id, {
        name: form.name,
        phone: form.phone,
        assignedLanes: form.assignedLanes,
      });
      setEditing(null);
    } else {
      await createDeliveryBoy(form);
    }

    setForm({
      name: "",
      phone: "",
      password: "",
      assignedLanes: [],
    });

    setRefresh(!refresh);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Update Delivery Boy" : "Add Delivery Boy"}
          </h2>
          <p className="text-sm text-gray-500">
            Assign lanes and manage delivery access.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-4">

          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600">
              Phone
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              required
            />
          </div>

          {!editing && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-gray-600">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
              />
            </div>
          )}
        </div>

        {/* Assign Lanes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Assign Lanes
          </h3>

          <div className="flex flex-wrap gap-3">
            {lanes.map((lane) => {
              const selected = form.assignedLanes.includes(
                lane._id
              );

              return (
                <button
                  type="button"
                  key={lane._id}
                  onClick={() => handleLaneChange(lane._id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    selected
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {lane.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button className="rounded-xl bg-gray-900 hover:bg-black text-white px-6 py-2.5 text-sm font-medium transition">
            {editing ? "Update" : "Add Delivery Boy"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryBoyForm;