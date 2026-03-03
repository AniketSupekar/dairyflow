import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import {
  CheckCircle2, XCircle, Umbrella, Clock, ChevronDown,
  ChevronUp, RefreshCw, AlertCircle, CalendarDays, ArrowLeft, ArrowRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateInput = (d) => d.toISOString().split("T")[0];
const todayStr    = () => toDateInput(new Date());

const fmtDate = (str) =>
  new Date(str).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const isToday = (str) => str === todayStr();

const STATUS_CFG = {
  DELIVERED:     { icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-50",  label: "Delivered"     },
  NOT_DELIVERED: { icon: XCircle,      cls: "text-red-400",     bg: "bg-red-50",      label: "Not Delivered" },
  HOLIDAY:       { icon: Umbrella,     cls: "text-blue-400",    bg: "bg-blue-50",     label: "Holiday"       },
};

// Compact progress bar — fills green as deliveries complete
function ProgressBar({ delivered, total }) {
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{pct}%</span>
    </div>
  );
}

// Lane status badge
function LaneBadge({ isComplete, notRecorded }) {
  if (isComplete)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 size={10} /> Complete
      </span>
    );
  if (notRecorded > 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <Clock size={10} /> {notRecorded} pending
      </span>
    );
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
const DeliverySummaryPage = () => {
  const [date, setDate]         = useState(todayStr());
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [expanded, setExpanded] = useState(new Set()); // expanded lane IDs

  const fetchSummary = useCallback(async (d) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/deliveries/daily-summary", { params: { date: d } });
      setData(res.data.data);
      // Auto-expand incomplete lanes on first load for today
      if (isToday(d)) {
        const incomplete = res.data.data.lanes
          .filter((l) => !l.isComplete && l.totalCustomers > 0)
          .map((l) => l.laneId.toString());
        setExpanded(new Set(incomplete));
      }
    } catch {
      setError("Failed to load delivery summary. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(date); }, [date, fetchSummary]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Navigate date by ±1 day
  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const str = toDateInput(d);
    if (str <= todayStr()) setDate(str);
  };

  const { summary, lanes } = data || { summary: null, lanes: [] };

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Delivery Summary</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isToday(date) ? "Live view of today's operations" : fmtDate(date)}
          </p>
        </div>
        <button
          onClick={() => fetchSummary(date)}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => shiftDate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-600"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="relative flex-shrink-0">
          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition"
          />
        </div>
        <button
          onClick={() => shiftDate(1)}
          disabled={date >= todayStr()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition text-gray-600"
        >
          <ArrowRight size={14} />
        </button>
        {!isToday(date) && (
          <button
            onClick={() => setDate(todayStr())}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition"
          >
            Today
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-medium text-red-700 flex-1">{error}</span>
          <button onClick={() => fetchSummary(date)} className="text-xs font-bold text-red-600 hover:text-red-800">Retry</button>
        </div>
      )}

      {/* Summary band */}
      {!loading && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard value={summary.totalDelivered}    label="Delivered"     color="emerald" />
          <SummaryCard value={summary.totalNotDelivered} label="Not Delivered" color="red"     />
          <SummaryCard value={summary.totalHoliday}      label="Holiday"       color="blue"    />
          <SummaryCard value={summary.totalNotRecorded}  label="Not Recorded"  color="amber"   />
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl px-5 py-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-gray-100 rounded" />
                  <div className="h-2 w-48 bg-gray-100 rounded-full" />
                </div>
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lane list */}
      {!loading && lanes.length > 0 && (
        <div className="space-y-2">
          {/* Lanes complete summary header */}
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {summary.completeLanes} of {summary.totalLanes} lanes complete
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(new Set(lanes.map((l) => l.laneId.toString())))}
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition"
              >
                Expand all
              </button>
              <span className="text-gray-200">·</span>
              <button
                onClick={() => setExpanded(new Set())}
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition"
              >
                Collapse all
              </button>
            </div>
          </div>

          {lanes.map((lane) => {
            const laneKey  = lane.laneId.toString();
            const isOpen   = expanded.has(laneKey);
            const recorded = lane.delivered + lane.notDelivered + lane.holiday;

            return (
              <div
                key={laneKey}
                className={`bg-white border rounded-2xl overflow-hidden transition-all
                  ${lane.isComplete ? "border-gray-100" : lane.notRecorded > 0 ? "border-amber-100" : "border-gray-100"}`}
              >
                {/* Lane header — always visible */}
                <button
                  onClick={() => toggleExpand(laneKey)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition text-left"
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                    ${lane.isComplete
                      ? "bg-emerald-400"
                      : lane.notRecorded === lane.totalCustomers
                        ? "bg-gray-200"
                        : "bg-amber-400"}`}
                  />

                  {/* Lane info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{lane.laneName}</p>
                      <LaneBadge isComplete={lane.isComplete} notRecorded={lane.notRecorded} />
                    </div>
                    <ProgressBar delivered={recorded} total={lane.totalCustomers} />
                  </div>

                  {/* Counts */}
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <Stat icon={CheckCircle2} val={lane.delivered}    cls="text-emerald-500" />
                    <Stat icon={XCircle}      val={lane.notDelivered} cls="text-red-400"     />
                    <Stat icon={Umbrella}     val={lane.holiday}      cls="text-blue-400"    />
                    {lane.notRecorded > 0 && (
                      <Stat icon={Clock} val={lane.notRecorded} cls="text-amber-500" />
                    )}
                  </div>

                  <div className="text-xs font-semibold text-gray-400 flex-shrink-0 ml-2">
                    {recorded}/{lane.totalCustomers}
                  </div>

                  {lane.totalCustomers > 0 && (
                    isOpen
                      ? <ChevronUp size={15} className="text-gray-300 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-gray-300 flex-shrink-0" />
                  )}
                </button>

                {/* Customer drill-down — accordion */}
                {isOpen && lane.customers.length > 0 && (
                  <div className="border-t border-gray-50">
                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                      <div className="col-span-5">Customer</div>
                      <div className="col-span-3">Product</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {lane.customers.map((c) => {
                        const cfg = STATUS_CFG[c.status] || STATUS_CFG.NOT_DELIVERED;
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={c.customerId?.toString()}
                            className="grid grid-cols-12 gap-2 items-center px-5 py-3 hover:bg-gray-50/40 transition"
                          >
                            <div className="col-span-5 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{c.customerName}</p>
                            </div>
                            <div className="col-span-3 min-w-0">
                              <p className="text-xs text-gray-500 truncate">{c.productName}</p>
                            </div>
                            <div className="col-span-2 text-center">
                              <p className="text-xs font-semibold text-gray-700">{c.quantity ?? "—"}</p>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.cls}`}>
                                <Icon size={9} />
                                <span className="hidden sm:inline">{cfg.label}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Not-recorded note */}
                    {lane.notRecorded > 0 && (
                      <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100/60">
                        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                          <Clock size={11} />
                          {lane.notRecorded} customer{lane.notRecorded !== 1 ? "s" : ""} not yet recorded for today
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty lane */}
                {isOpen && lane.customers.length === 0 && (
                  <div className="px-5 py-4 border-t border-gray-50 text-xs text-gray-400 font-medium">
                    No delivery records entered for this lane yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No lanes */}
      {!loading && !error && lanes.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3">
          <CalendarDays size={22} className="text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No lanes found</p>
          <p className="text-xs text-gray-400">Add lanes and customers to see the summary.</p>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function SummaryCard({ value, label, color }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    red:     "bg-red-50 text-red-600",
    blue:    "bg-blue-50 text-blue-700",
    amber:   "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl px-4 py-3.5 ${colorMap[color]}`}>
      <p className="text-2xl font-bold leading-none">{value ?? 0}</p>
      <p className="text-[11px] font-semibold mt-1.5 opacity-80">{label}</p>
    </div>
  );
}

function Stat({ icon: Icon, val, cls }) {
  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${cls}`}>
      <Icon size={12} />
      <span>{val}</span>
    </div>
  );
}

export default DeliverySummaryPage;