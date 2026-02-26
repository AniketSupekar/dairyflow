import { useEffect, useState } from "react";
import { getLanes, deleteLane } from "../../api/lane.api";
import LaneForm from "./LaneForm";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { Pencil, Trash2, Plus, MapPin, Route } from "lucide-react";

const LaneList = () => {
  const [lanes, setLanes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toasts, toast } = useToast();

  useEffect(() => {
    fetchLanes();
  }, [refresh]);

  const fetchLanes = async () => {
    const res = await getLanes();
    setLanes(res.data.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lane?")) return;
    setDeletingId(id);
    await deleteLane(id);
    setDeletingId(null);
    setRefresh(!refresh);
    toast({ message: "Lane deleted", type: "success" });
  };

  const handleEdit = (lane) => {
    setEditing(lane);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleAddNew = () => {
    setEditing(null);
    setShowForm((prev) => !prev);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Lanes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage delivery lanes</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} strokeWidth={2.5} />
          {showForm && !editing ? "Cancel" : "Add Lane"}
        </button>
      </div>

      {/* Stat card */}
      {lanes.length > 0 && (
        <div className="max-w-[180px]">
          <StatCard
            icon={<Route size={14} />}
            label="Total Lanes"
            value={lanes.length}
          />
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <LaneForm
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
          onCancel={handleCloseForm}
          onSuccess={(msg) => toast({ message: msg, type: "success" })}
        />
      )}

      {/* Empty state */}
      {lanes.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <MapPin size={20} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">No lanes yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first lane to get started</p>
          </div>
          <button
            onClick={handleAddNew}
            className="mt-1 inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            <Plus size={13} /> Add Lane
          </button>
        </div>
      ) : lanes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lanes.map((lane) => (
            <div
              key={lane._id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{lane.name}</p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                <button
                  onClick={() => handleEdit(lane)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(lane._id)}
                  disabled={deletingId === lane._id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Toast notifications */}
      <Toast toasts={toasts} />

    </div>
  );
};

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default LaneList;