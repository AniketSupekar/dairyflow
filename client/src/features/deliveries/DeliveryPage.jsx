import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getLanes } from "../../api/lane.api";
import { getProducts } from "../../api/product.api";
import { getCustomersByLane } from "../../api/customer.api";
import {
  getDeliveriesByDateAndLane,
  upsertDeliveryRecord,
  deleteDeliveryRecord,
} from "../../api/deliveryRecord.api";
import Toast from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import {
  Pencil, Trash2, Plus, X, ClipboardList,
  UserCheck, Search, CheckCircle2, XCircle, Palmtree,
} from "lucide-react";

const DeliveryPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const today = new Date().toISOString().split("T")[0];

  const [lanes, setLanes] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLane, setSelectedLane] = useState("");
  const [date, setDate] = useState(today);

  const [addedCustomers, setAddedCustomers] = useState([]);
  const [remainingCustomers, setRemainingCustomers] = useState([]);

  const [isAddMode, setIsAddMode] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { toasts, toast } = useToast();

  // ─── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => { fetchInitial(); }, []);

  useEffect(() => {
    if (selectedLane) { setSearch(""); setCurrentPage(1); loadData(); }
  }, [selectedLane, date]);

  const fetchInitial = async () => {
    const productRes = await getProducts();
    setProducts(productRes.data.data);

    if (isAdmin) {
      const laneRes = await getLanes();
      setLanes(laneRes.data.data);
    } else {
      const assigned = user.assignedLanes || [];
      const formatted = assigned.map((laneId) => ({ _id: laneId, name: "Assigned Lane" }));
      setLanes(formatted);
      if (formatted.length > 0) setSelectedLane(formatted[0]._id);
    }
  };

  const loadData = async () => {
    const [custRes, deliveryRes] = await Promise.all([
      getCustomersByLane(selectedLane),
      getDeliveriesByDateAndLane(date, selectedLane),
    ]);

    const customers = custRes.data.data;
    const records = deliveryRes.data.data;
    const recordedIds = [...new Set(records.map((r) => r.customerId._id))];

    setAddedCustomers(
      customers
        .filter((c) => recordedIds.includes(c._id))
        .map((c) => ({
          ...c,
          productRows: records
            .filter((r) => r.customerId._id === c._id)
            .map((rec) => ({
              productId: rec.productId._id,
              productName: rec.productId.name,
              quantity: rec.quantity,
              rate: rec.rate,
              status: rec.status,
              recordId: rec._id,
              isRemoved: false,
            })),
        }))
    );

    setRemainingCustomers(
      customers
        .filter((c) => !recordedIds.includes(c._id))
        .map((c) => ({
          ...c,
          productRows: c.subscriptions.map((sub) => ({
            productId: sub.productId._id,
            productName: sub.productId.name,
            quantity: sub.quantity,
            rate: sub.productId.rate,
            status: "DELIVERED",
            recordId: null,
            isRemoved: false,
          })),
        }))
    );

    setEditingCustomerId(null);
  };

  // ─── Filtered lists (client-side search, zero extra API calls) ────────────────

  const filteredAdded = useMemo(() => {
    if (!search.trim()) return addedCustomers;
    const q = search.toLowerCase();
    return addedCustomers.filter((c) => c.name.toLowerCase().includes(q));
  }, [addedCustomers, search]);

  const filteredRemaining = useMemo(() => {
    if (!search.trim()) return remainingCustomers;
    const q = search.toLowerCase();
    return remainingCustomers.filter((c) => c.name.toLowerCase().includes(q));
  }, [remainingCustomers, search]);

  // ─── Pagination ───────────────────────────────────────────────────────────────

  const activeFullList = isAddMode ? filteredRemaining : filteredAdded;
  const totalPages = Math.max(1, Math.ceil(activeFullList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = activeFullList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // ─── Summary stats (memoized) ─────────────────────────────────────────────────

  const summary = useMemo(() => {
    const rows = addedCustomers.flatMap((c) => c.productRows.filter((r) => !r.isRemoved));
    return {
      delivered: rows.filter((r) => r.status === "DELIVERED").length,
      notDelivered: rows.filter((r) => r.status === "NOT_DELIVERED").length,
      holiday: rows.filter((r) => r.status === "HOLIDAY").length,
      total: rows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.rate), 0),
    };
  }, [addedCustomers]);

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const handleRowChange = (custId, index, field, value, type) => {
    const setter = type === "added" ? setAddedCustomers : setRemainingCustomers;
    setter((prev) =>
      prev.map((c) =>
        c._id === custId
          ? { ...c, productRows: c.productRows.map((row, i) => i === index ? { ...row, [field]: value } : row) }
          : c
      )
    );
  };

  const addProductRow = (custId, type) => {
    const setter = type === "added" ? setAddedCustomers : setRemainingCustomers;
    setter((prev) =>
      prev.map((c) =>
        c._id === custId
          ? {
              ...c,
              productRows: [
                ...c.productRows,
                {
                  productId: products[0]?._id,
                  productName: products[0]?.name,
                  quantity: 1,
                  rate: products[0]?.rate || 0,
                  status: "DELIVERED",
                  recordId: null,
                  isRemoved: false,
                },
              ],
            }
          : c
      )
    );
  };

  const removeRow = (custId, index, type) => {
    const setter = type === "added" ? setAddedCustomers : setRemainingCustomers;
    setter((prev) =>
      prev.map((c) =>
        c._id === custId
          ? {
              ...c,
              productRows:
                type === "added"
                  ? c.productRows.map((row, i) => i === index ? { ...row, isRemoved: true } : row)
                  : c.productRows.filter((_, i) => i !== index),
            }
          : c
      )
    );
  };

  const handleCustomerSave = async (cust, type) => {
    setSavingId(cust._id);
    try {
      for (const row of cust.productRows) {
        if (row.isRemoved && row.recordId) {
          await deleteDeliveryRecord(row.recordId);
          continue;
        }
        if (!row.isRemoved && row.productId) {
          await upsertDeliveryRecord({
            customerId: cust._id,
            productId: row.productId,
            quantity: Number(row.quantity),
            rate: Number(row.rate),
            status: row.status,
            date,
          });
        }
      }
      await loadData();
      toast({ message: `Saved delivery for ${cust.name}`, type: "success" });
    } catch (err) {
      toast({ message: err?.response?.data?.message || "Failed to save", type: "error" });
    }
    setSavingId(null);
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm("Delete all delivery records for this customer?")) return;
    setDeletingId(cust._id);
    try {
      for (const row of cust.productRows) {
        if (row.recordId) await deleteDeliveryRecord(row.recordId);
      }
      await loadData();
      toast({ message: `Records deleted for ${cust.name}`, type: "success" });
    } catch {
      toast({ message: "Failed to delete records", type: "error" });
    }
    setDeletingId(null);
  };

  // ─── Status badge ─────────────────────────────────────────────────────────────

  const StatusBadge = ({ status }) => {
    const styles = {
      DELIVERED: "bg-green-50 text-green-700 border-green-100",
      NOT_DELIVERED: "bg-red-50 text-red-600 border-red-100",
      HOLIDAY: "bg-amber-50 text-amber-600 border-amber-100",
    };
    const labels = { DELIVERED: "Delivered", NOT_DELIVERED: "Not Delivered", HOLIDAY: "Holiday" };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${styles[status] || "bg-gray-100 text-gray-500 border-gray-100"}`}>
        {labels[status] || status}
      </span>
    );
  };

  // ─── Customer card ────────────────────────────────────────────────────────────

  const renderCustomerCard = (cust, type) => {
    const isEditing = editingCustomerId === cust._id;
    const isSaving = savingId === cust._id;
    const isDeleting = deletingId === cust._id;
    const visibleRows = cust.productRows.filter((r) => !r.isRemoved);
    const cardTotal = visibleRows.reduce((s, r) => s + Number(r.quantity) * Number(r.rate), 0);

    return (
      <div key={cust._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{cust.name}</p>
            {!isEditing && type === "added" && (
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">₹{cardTotal.toFixed(0)} total</p>
            )}
          </div>
          {type === "added" && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={() => setEditingCustomerId(isEditing ? null : cust._id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition text-blue-400 hover:text-blue-600"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDeleteCustomer(cust)}
                disabled={isDeleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {visibleRows.map((row, index) =>
            isEditing || type === "remaining" ? (
              <div key={index} className="space-y-2 bg-gray-50 rounded-xl p-3">
                <select
                  value={row.productId}
                  onChange={(e) => handleRowChange(cust._id, index, "productId", e.target.value, type)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Qty", field: "quantity", type: "number" },
                    { label: "Rate", field: "rate", type: "number" },
                  ].map(({ label, field, type: itype }) => (
                    <div key={field}>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">{label}</label>
                      <input
                        type={itype}
                        value={row[field]}
                        onChange={(e) => handleRowChange(cust._id, index, field, e.target.value, type)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                    <select
                      value={row.status}
                      onChange={(e) => handleRowChange(cust._id, index, "status", e.target.value, type)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    >
                      <option value="DELIVERED">Delivered</option>
                      <option value="NOT_DELIVERED">Not Delivered</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => removeRow(cust._id, index, type)}
                  className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 transition"
                >
                  <X size={12} /> Remove row
                </button>
              </div>
            ) : (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{row.productName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{row.quantity} × ₹{row.rate} = ₹{(row.quantity * row.rate).toFixed(0)}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            )
          )}

          {(isEditing || type === "remaining") && (
            <div className="pt-1 space-y-2">
              <button
                onClick={() => addProductRow(cust._id, type)}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
              >
                <Plus size={13} /> Add product row
              </button>
              <button
                onClick={() => handleCustomerSave(cust, type)}
                disabled={isSaving}
                className="w-full bg-gray-900 hover:bg-black text-white rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Grid renderer ────────────────────────────────────────────────────────────

  const renderGrid = () => {
    if (!selectedLane) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 mb-1">Select a lane to continue</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">Choose a lane from the filters above.</p>
        </div>
      );
    }

    const rawList = isAddMode ? remainingCustomers : addedCustomers;
    const isSearchActive = search.trim().length > 0;

    if (isAddMode && rawList.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
            <UserCheck size={24} className="text-green-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">All customers recorded</p>
          <p className="text-xs text-gray-400 text-center max-w-xs mb-5">All customers in this lane have entries for the selected date.</p>
          <button onClick={() => setIsAddMode(false)} className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold">
            View Records
          </button>
        </div>
      );
    }

    if (!isAddMode && rawList.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">No deliveries recorded</p>
          <p className="text-xs text-gray-400 text-center max-w-xs mb-5">
            No records for this date and lane.{isAdmin ? ' Click "Add" to start.' : " Start adding entries."}
          </p>
          <button onClick={() => setIsAddMode(true)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Plus size={13} /> Add Delivery Records
          </button>
        </div>
      );
    }

    if (isSearchActive && activeFullList.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-14 px-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Search size={18} className="text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No results for &ldquo;{search}&rdquo;</p>
          <p className="text-xs text-gray-400 mt-1">Try a different customer name</p>
        </div>
      );
    }

    return paginatedList.map((cust) => renderCustomerCard(cust, isAddMode ? "remaining" : "added"));
  };

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Delivery Records</h1>
          {selectedLane && (
            <p className="text-sm text-gray-500 mt-0.5">
              {isAddMode
                ? `${remainingCustomers.length} customer${remainingCustomers.length !== 1 ? "s" : ""} pending`
                : `${addedCustomers.length} record${addedCustomers.length !== 1 ? "s" : ""} for ${date}`}
            </p>
          )}
        </div>
        <button
          onClick={() => { setIsAddMode(!isAddMode); setSearch(""); setCurrentPage(1); }}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={15} strokeWidth={2.5} />
          {isAddMode ? "Close" : "Add"}
        </button>
      </div>

      {/* Filters card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-end">
        {isAdmin && (
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-700 transition"
            />
          </div>
        )}

        {(isAdmin || lanes.length > 1) && (
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lane</label>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-700 transition"
            >
              <option value="">Select Lane</option>
              {lanes.map((lane) => (
                <option key={lane._id} value={lane._id}>{lane.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedLane && (
          <div className="space-y-1.5 w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search customer..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none pl-9 pr-8 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition"
              />
              {search && (
                <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats — view mode only */}
      {selectedLane && !isAddMode && addedCustomers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={<CheckCircle2 size={14} />} label="Delivered" value={summary.delivered} color="green" />
          <SummaryCard icon={<XCircle size={14} />} label="Not Delivered" value={summary.notDelivered} color="red" />
          <SummaryCard icon={<Palmtree size={14} />} label="Holiday" value={summary.holiday} color="amber" />
          <SummaryCard icon={<span className="text-sm font-bold">₹</span>} label="Day Total" value={`₹${summary.total.toFixed(0)}`} color="gray" />
        </div>
      )}

      {/* Mode pill */}
      {selectedLane && (
        <div>
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold border ${
            isAddMode ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-100 text-gray-600 border-gray-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAddMode ? "bg-blue-500" : "bg-gray-400"}`} />
            {isAddMode ? "Add Mode — Pending customers" : "View Mode — Recorded entries"}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderGrid()}
      </div>

      {/* Pagination */}
      {selectedLane && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-1 pb-4">
          <p className="text-xs text-gray-400 font-medium">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeFullList.length)} of {activeFullList.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                      safePage === item
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
};

function SummaryCard({ icon, label, value, color }) {
  const border = { green: "border-green-100", red: "border-red-100", amber: "border-amber-100", gray: "border-gray-100" };
  const iconCls = { green: "bg-green-100 text-green-600", red: "bg-red-100 text-red-500", amber: "bg-amber-100 text-amber-600", gray: "bg-gray-100 text-gray-600" };
  return (
    <div className={`bg-white border rounded-2xl px-4 py-3.5 flex items-center gap-3 ${border[color]}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default DeliveryPage;