import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import {
  getDeliveryBoys,
  deactivateDeliveryBoy,
  getInactiveDeliveryBoys,
  restoreDeliveryBoy,
} from "../../api/deliveryBoy.api";
import DeliveryBoyForm from "./DeliveryBoyForm";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { Pencil, Trash2, Plus, Truck, UserX, RotateCcw } from "lucide-react";

const DeliveryBoyPage = () => {
  const [lanes, setLanes] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [inactiveBoys, setInactiveBoys] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const { toasts, toast } = useToast();

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { fetchDeliveryBoys(); fetchInactive(); }, [refresh]);

  const fetchInitialData = async () => {
    const laneRes = await getLanes();
    setLanes(laneRes.data.data);
    fetchDeliveryBoys();
    fetchInactive();
  };

  const fetchDeliveryBoys = async () => {
    const res = await getDeliveryBoys();
    setDeliveryBoys(res.data.data);
  };

  const fetchInactive = async () => {
    const res = await getInactiveDeliveryBoys();
    setInactiveBoys(res.data.data);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Deactivate this delivery boy?")) return;
    setDeletingId(id);
    await deactivateDeliveryBoy(id);
    setDeletingId(null);
    setRefresh(!refresh);
    toast({ message: "Delivery boy deactivated", type: "success" });
  };

  const handleRestore = async (id) => {
    setRestoringId(id);
    await restoreDeliveryBoy(id);
    setRestoringId(null);
    setRefresh(!refresh);
    toast({ message: "Delivery boy restored successfully", type: "success" });
  };

  const handleEdit = (boy) => { setEditing(boy); setShowForm(true); };
  const handleCloseForm = () => { setShowForm(false); setEditing(null); };
  const handleAddNew = () => { setEditing(null); setShowForm((p) => !p); };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Delivery Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage delivery personnel and lane assignments</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} strokeWidth={2.5} />
          {showForm && !editing ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Stat cards */}
      {!showForm && (deliveryBoys.length > 0 || inactiveBoys.length > 0) && (
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <StatCard
            icon={<Truck size={14} />}
            label="Active"
            value={deliveryBoys.length}
          />
          <StatCard
            icon={<UserX size={14} />}
            label="Inactive"
            value={inactiveBoys.length}
            clickable
            highlighted={showInactive}
            onClick={() => setShowInactive((p) => !p)}
          />
        </div>
      )}

      {/* Inactive panel */}
      {showInactive && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX size={15} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Inactive Delivery Boys</h3>
              <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {inactiveBoys.length}
              </span>
            </div>
            <button
              onClick={() => setShowInactive(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition"
            >
              Close
            </button>
          </div>

          {inactiveBoys.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-gray-500">No inactive delivery boys</p>
              <p className="text-xs text-gray-400 mt-1">Deactivated members will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {inactiveBoys.map((boy) => (
                <div key={boy._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{boy.name}</p>
                    {boy.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{boy.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(boy._id)}
                    disabled={restoringId === boy._id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition disabled:opacity-40 flex-shrink-0 ml-3"
                  >
                    <RotateCcw size={12} />
                    {restoringId === boy._id ? "Restoring…" : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <DeliveryBoyForm
          lanes={lanes}
          editing={editing}
          setEditing={setEditing}
          refresh={refresh}
          setRefresh={setRefresh}
          onCancel={handleCloseForm}
          onSuccess={(msg) => toast({ message: msg, type: "success" })}
        />
      )}

      {/* Empty state */}
      {!showForm && deliveryBoys.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Truck size={20} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">No delivery boys yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first team member to get started</p>
          </div>
          <button
            onClick={handleAddNew}
            className="mt-1 inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            <Plus size={13} /> Add Delivery Boy
          </button>
        </div>
      )}

      {/* Active grid */}
      {!showForm && deliveryBoys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deliveryBoys.map((boy) => (
            <div
              key={boy._id}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{boy.name}</p>
                  {boy.phone && (
                    <p className="text-xs text-gray-500 mt-0.5">{boy.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(boy)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeactivate(boy._id)}
                    disabled={deletingId === boy._id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 disabled:opacity-40"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Assigned lanes */}
              {boy.assignedLanes?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {boy.assignedLanes.map((lane) => (
                    <span
                      key={lane._id}
                      className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                    >
                      {lane.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No lanes assigned</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
};

function StatCard({ icon, label, value, onClick, clickable, highlighted }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition
        ${clickable ? "cursor-pointer hover:border-gray-300 hover:shadow-sm" : ""}
        ${highlighted ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}
      `}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${highlighted ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}
      `}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default DeliveryBoyPage;