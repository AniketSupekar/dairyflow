import { useEffect, useState, useMemo, useCallback } from "react";
import { getOutstandingList } from "../../api/outstanding.api";
import { getLanes } from "../../api/lane.api";
import { useTenant } from "../../hooks/useTenant";
import { buildReminderMessage, openWhatsApp } from "../../utils/whatsapp.util";
import CustomerFinancialPanel from "../../components/CustomerFinancialPanel";
import {
  AlertCircle, ArrowDownUp, Search, X,
  RefreshCw, MapPin, Phone, TrendingDown,
  ChevronUp, ChevronDown, IndianRupee,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;

const getUrgency = (oldestDate) => {
  if (!oldestDate) return null;
  const days = Math.floor((Date.now() - new Date(oldestDate)) / 86_400_000);
  if (days > 60) return { label: "60+ days", cls: "bg-red-100 text-red-700 border-red-200" };
  if (days > 30) return { label: "30+ days", cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (days > 14) return { label: "14+ days", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return null;
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

// ── RemindButton — logoUrl received as prop (tenant not in scope here) ────────
const RemindButton = ({ customerName, phone, outstanding, dairyName, upiId, logoUrl }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    const message = buildReminderMessage({ customerName, dairyName, outstanding, upiId, logoUrl });
    openWhatsApp({ phone, message });
  };
  return (
    <button
      onClick={handleClick}
      title="Send WhatsApp reminder"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366]
        hover:bg-[#1ebe5d] text-white text-[11px] font-semibold transition-colors flex-shrink-0"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.532 5.853L.073 23.927a.5.5 0 00.611.611l6.074-1.459A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.998-1.366l-.358-.213-3.715.893.907-3.617-.234-.372A9.818 9.818 0 1112 21.818z"/>
      </svg>
      Remind
    </button>
  );
};

const OutstandingPage = () => {
  const { tenant } = useTenant();

  const [customers, setCustomers]   = useState([]);
  const [summary, setSummary]       = useState({ totalOutstanding: 0, totalCustomers: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [lanes, setLanes]           = useState([]);
  const [lanesLoaded, setLanesLoaded] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [laneFilter, setLaneFilter] = useState("");
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState("outstanding");
  const [order, setOrder]           = useState("desc");
  const [page, setPage]             = useState(1);

  const [panelCustomer, setPanelCustomer] = useState(null);

  const dairyName = tenant?.businessName || tenant?.name || "Dairy";
  const upiId     = tenant?.upiId    || "";
  const logoUrl   = tenant?.logoUrl  || "";

  useEffect(() => {
    getLanes()
      .then((res) => { setLanes(res.data.data); setLanesLoaded(true); })
      .catch(() => setLanesLoaded(true));
  }, []);

  const fetchData = useCallback(async (resetPage = false) => {
    setLoading(true); setError("");
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    try {
      const res = await getOutstandingList({
        laneId: laneFilter || undefined, sortBy, order, page: targetPage, limit: PAGE_SIZE,
      });
      const d = res.data.data;
      setCustomers(d.customers); setSummary(d.summary); setPagination(d.pagination);
    } catch (err) {
      setError("Failed to load outstanding data. Please retry."); console.error(err);
    } finally { setLoading(false); }
  }, [laneFilter, sortBy, order, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLaneFilter = (v) => { setLaneFilter(v); setSearch(""); setPage(1); };
  const handleSort = (field) => {
    if (sortBy === field) setOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSortBy(field); setOrder("desc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.customerName.toLowerCase().includes(q) || c.phone?.includes(q) || c.laneName?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowDownUp size={12} className="text-gray-300" />;
    return order === "desc" ? <ChevronDown size={13} className="text-gray-700" /> : <ChevronUp size={13} className="text-gray-700" />;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-5">

      {panelCustomer && (
        <CustomerFinancialPanel customerId={panelCustomer._id} customer={panelCustomer} onClose={() => setPanelCustomer(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Outstanding Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">All customers with unpaid or partially paid bills</p>
        </div>
        <button onClick={() => fetchData()} disabled={loading}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition disabled:opacity-40">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary band */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-rose-600 leading-none">₹{fmt(summary.totalOutstanding)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customers Owing</p>
            <p className="text-2xl font-bold text-gray-900 leading-none">{summary.totalCustomers}</p>
          </div>
        </div>
      )}

      {/* UPI active indicator */}
      {upiId && !loading && !error && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 max-w-sm">
          <IndianRupee size={12} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            Pay link active · Reminders include <span className="font-bold">{upiId}</span>
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-medium text-red-700 flex-1">{error}</span>
          <button onClick={() => fetchData()} className="text-xs font-bold text-red-600 hover:text-red-800 transition">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={laneFilter} onChange={(e) => handleLaneFilter(e.target.value)}
          className="sm:w-52 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none px-3.5 py-2.5 text-sm text-gray-700 transition">
          <option value="">All Lanes</option>
          {lanes.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none pl-9 pr-8 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-gray-400 font-medium">Sort:</span>
          <button onClick={() => handleSort("outstanding")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition
              ${sortBy === "outstanding" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <IndianRupee size={11} /> Amount <SortIcon field="outstanding" />
          </button>
          <button onClick={() => handleSort("name")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition
              ${sortBy === "name" ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            Name <SortIcon field="name" />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(PAGE_SIZE)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
                <div className="h-6 w-24 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <TrendingDown size={20} className="text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">
              {pagination.total === 0 ? "All caught up!" : `No results for "${search}"`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {pagination.total === 0
                ? "No outstanding payments — all bills are settled."
                : "Try a different name or clear the search."}
            </p>
          </div>
        </div>
      )}

      {/* Customer list */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <div className="col-span-4">Customer</div>
            <div className="col-span-2">Lane</div>
            <div className="col-span-2 text-right">Billed</div>
            <div className="col-span-2 text-right">Paid</div>
            <div className="col-span-2 text-right">Outstanding</div>
          </div>

          <div className="space-y-2">
            {filtered.map((c) => {
              const urgency = getUrgency(c.oldestUnpaidDate);
              return (
                <div key={c.customerId}
                  onClick={() => setPanelCustomer({ _id: c.customerId, name: c.customerName, phone: c.phone })}
                  className="group bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl px-5 py-4 cursor-pointer transition-all"
                >
                  {/* Mobile */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{c.customerName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {c.phone && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} /> {c.phone}</span>}
                          <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={10} /> {c.laneName}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-rose-600">₹{fmt(c.outstanding)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">outstanding</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BillBadge unpaid={c.unpaidCount} partial={c.partialCount} />
                        {urgency && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.cls}`}>{urgency.label}</span>}
                      </div>
                      <RemindButton
                        customerName={c.customerName}
                        phone={c.phone}
                        outstanding={c.outstanding}
                        dairyName={dairyName}
                        upiId={upiId}
                        logoUrl={logoUrl}
                      />
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{c.customerName}</p>
                        <BillBadge unpaid={c.unpaidCount} partial={c.partialCount} />
                        {urgency && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${urgency.cls}`}>{urgency.label}</span>}
                      </div>
                      {c.phone && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Phone size={10} /> {c.phone}</p>}
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
                        <MapPin size={10} /> {c.laneName}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-gray-700">₹{fmt(c.totalBilled)}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-green-600">₹{fmt(c.totalPaid)}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <p className="text-base font-bold text-rose-600">₹{fmt(c.outstanding)}</p>
                      <RemindButton
                        customerName={c.customerName}
                        phone={c.phone}
                        outstanding={c.outstanding}
                        dairyName={dairyName}
                        upiId={upiId}
                        logoUrl={logoUrl}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-1 pb-2">
              <p className="text-xs text-gray-400 font-medium">
                Showing {(pagination.page - 1) * PAGE_SIZE + 1}–{Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total} customers
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                  .map((item, idx) => item === "..." ? (
                    <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                  ) : (
                    <button key={item} onClick={() => setPage(item)} disabled={loading}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${page === item ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {item}
                    </button>
                  ))}
                <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages || loading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function BillBadge({ unpaid, partial }) {
  if (unpaid === 0 && partial === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {unpaid > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">{unpaid} unpaid</span>}
      {partial > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">{partial} partial</span>}
    </div>
  );
}

export default OutstandingPage;