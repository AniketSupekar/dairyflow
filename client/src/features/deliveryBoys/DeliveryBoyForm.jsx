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
    <form onSubmit={handleSubmit} className="border p-4 space-y-3">
      <input
        type="text"
        placeholder="Name"
        className="border p-2 w-full"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
        required
      />

      <input
        type="text"
        placeholder="Phone"
        className="border p-2 w-full"
        value={form.phone}
        onChange={(e) =>
          setForm({ ...form, phone: e.target.value })
        }
        required
      />

      {!editing && (
        <input
          type="password"
          placeholder="Password"
          className="border p-2 w-full"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
          required
        />
      )}

      <div>
        <h3 className="font-semibold">
          Assign Lanes
        </h3>
        {lanes.map((lane) => (
          <div key={lane._id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.assignedLanes.includes(lane._id)}
              onChange={() => handleLaneChange(lane._id)}
            />
            <label>{lane.name}</label>
          </div>
        ))}
      </div>

      <button className="bg-blue-600 text-white px-4 py-2">
        {editing ? "Update" : "Add Delivery Boy"}
      </button>
    </form>
  );
};

export default DeliveryBoyForm;