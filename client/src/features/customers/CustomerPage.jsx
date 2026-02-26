import { useEffect, useState } from "react";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import {
  getAllCustomers,
  deleteCustomer,
  getInactiveCustomers,
  restoreCustomer,
} from "../../api/customer.api";
import CustomerForm from "./CustomerForm";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import {
  Pencil, Trash2, Plus, Users, UserX,
  ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";

const CustomerPage = () => {
  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");

  // Active customers
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Inactive customers
  const [inactiveCustomers, setInactiveCustomers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const { toasts, toast } = useToast();

  useEffect(() => { fetchInitialData(); }, []);

  useEffect(() => {
    if (selectedLane) {
      fetchCustomers();
      fetchInactive();
    }
  }, [selectedLane, refresh, page, search]);

  const fetchInitialData = async () => {
    const [laneRes, productRes] = await Promise.all([getLanes(), getProducts()]);
    setLanes(laneRes.data.data);
    setProducts(productRes.data.data);
  };

  const fetchCustomers = async () => {
    const res = await getAllCustomers({ page, limit: 10, search });
    const filtered = res.data.data.filter((c) => c.laneId?._id === selectedLane);
    setCustomers(filtered);
    setPagination(res.data.pagination);
  };

  const fetchInactive = async () => {
    const res = await getInactiveCustomers(selectedLane);
    setInactiveCustomers(res.data.data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this customer?")) return;
    setDeletingId(id);
    try {
      await deleteCustomer(id);
      setRefresh(!refresh);
      toast({ message: "Customer deactivated", type: "success" });
    } catch (err) {
      toast({
        message: err?.response?.data?.message || "Cannot deactivate customer",
        type: "error",
      });
    }
    setDeletingId(null);
  };

  const handleRestore = async (id) => {
    setRestoringId(id);
    await restoreCustomer(id);
    setRestoringId(null);
    setRefresh(!refresh);
    toast({ message: "Customer restored successfully", type: "success" });
  };

  const handleEdit = (cust) => { setEditing(cust); setShowForm(true); };
  const handleCloseForm = () => { setShowForm(false); setEditing(null); };
  const handleAddNew = () => { setEditing(null); setShowForm((p) => !p); };

  const handleLaneChange = (laneId) => {
    setSelectedLane(laneId);
    setShowForm(false);
    setEditing(null);
    setPage(1);
    setSearch("");
    setShowInactive(false);
  };

  // Determine empty state context
  const isSearchActive = search.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage customers</p>
        </div>
        {selectedLane && (
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={15} strokeWidth={2.5} />
            {showForm && !editing ? "Cancel" : "Add Customer"}
          </button>
        )}
      </div>

      {/* Lane + Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Lane</label>
          <select
            value={selectedLane}
            onChange={(e) => handleLaneChange(e.target.value)}
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-700 transition"
          >
            <option value="">Select a lane</option>
            {lanes.map((lane) => (
              <option key={lane._id} value={lane._id}>{lane.name}</option>
            ))}
          </select>
        </div>

        {selectedLane && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-80 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition"
            />
          </div>
        )}
      </div>

      {selectedLane && (
        <div className="space-y-5">

          {/* Stat cards */}
          {!showForm && (
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <StatCard
                icon={<Users size={14} />}
                label="Active"
                value={customers.length}
                active
              />
              <StatCard
                icon={<UserX size={14} />}
                label="Inactive"
                value={inactiveCustomers.length}
                onClick={() => setShowInactive((p) => !p)}
                clickable
                highlighted={showInactive}
              />
            </div>
          )}

          {/* Inactive panel */}
          {showInactive && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX size={15} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Inactive Customers</h3>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {inactiveCustomers.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowInactive(false)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-700 transition"
                >
                  Close
                </button>
              </div>

              {inactiveCustomers.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-gray-500">No inactive customers</p>
                  <p className="text-xs text-gray-400 mt-1">Deactivated customers will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {inactiveCustomers.map((cust) => (
                    <div key={cust._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{cust.name}</p>
                        {cust.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">{cust.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRestore(cust._id)}
                        disabled={restoringId === cust._id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition disabled:opacity-40 flex-shrink-0 ml-3"
                      >
                        <RotateCcw size={12} />
                        {restoringId === cust._id ? "Restoring…" : "Restore"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {showForm && (
            <CustomerForm
              products={products}
              laneId={selectedLane}
              editing={editing}
              setEditing={setEditing}
              refresh={refresh}
              setRefresh={setRefresh}
              onCancel={handleCloseForm}
              onSuccess={(msg) => toast({ message: msg, type: "success" })}
            />
          )}

          {/* Empty states */}
          {!showForm && customers.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl py-14 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                {isSearchActive
                  ? <Users size={20} className="text-gray-400" />
                  : <Users size={20} className="text-gray-400" />
                }
              </div>
              <div className="text-center">
                {isSearchActive ? (
                  <>
                    <p className="text-sm font-semibold text-gray-700">
                      No results for &ldquo;{search}&rdquo;
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Try a different name or phone number</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">No customers in this lane</p>
                    <p className="text-xs text-gray-400 mt-1">Add your first customer to get started</p>
                  </>
                )}
              </div>
              {!isSearchActive && (
                <button
                  onClick={handleAddNew}
                  className="mt-1 inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  <Plus size={13} /> Add Customer
                </button>
              )}
            </div>
          )}

          {/* Customer grid */}
          {!showForm && customers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customers.map((cust) => (
                <div
                  key={cust._id}
                  className="bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cust.name}</p>
                      {cust.phone && (
                        <p className="text-xs text-gray-500 mt-0.5">{cust.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(cust)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cust._id)}
                        disabled={deletingId === cust._id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 disabled:opacity-40"
                        title="Deactivate"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {cust.subscriptions?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cust.subscriptions.map((sub, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                        >
                          {sub.productId?.name} × {sub.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No subscriptions</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-gray-600">{page} / {pagination.pages}</span>
              <button
                disabled={page === pagination.pages}
                onClick={() => setPage(page + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

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

export default CustomerPage;