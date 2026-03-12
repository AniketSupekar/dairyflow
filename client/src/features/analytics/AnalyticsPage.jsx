// AnalyticsPage.jsx — v2
// Improvements over v1:
//   - Date range filter: specific month picker (fromMonth → toMonth) + quick presets (3M/6M/12M)
//   - Mobile: chart height reduced, X-axis labels angled at 12M, chart padding tightened
//   - Mobile: summary cards stay 3-col even on small screens (compact numbers)
//   - Month filter also drives "This period" summary cards (not hardcoded to current month)
//   - Backend receives fromMonth + toMonth params instead of just `months` count

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../../api/axios";
import {
  TrendingUp, IndianRupee, AlertCircle, Calendar,
  RefreshCw, ArrowRight, Wallet, CheckCircle2,
  ChevronRight, BarChart2, ChevronDown,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const fmtShort = (n) => {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${fmt(n)}`;
};

const MODE_CONFIG = {
  CASH:  { label: "Cash",          color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
  UPI:   { label: "UPI",           color: "bg-violet-500",  light: "bg-violet-50 text-violet-700"   },
  BANK:  { label: "Bank Transfer", color: "bg-blue-500",    light: "bg-blue-50 text-blue-700"       },
  OTHER: { label: "Other",         color: "bg-gray-400",    light: "bg-gray-50 text-gray-600"       },
};

// Generate YYYY-MM string for N months ago
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// All months from 2 years ago to now for the picker
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    options.push({ val, label });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

const PRESETS = [
  { label: "3M",  months: 3  },
  { label: "6M",  months: 6  },
  { label: "12M", months: 12 },
];

// Custom recharts tooltip
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-semibold text-xs">{p.name}</span>
          <span className="font-bold text-gray-900">₹{fmt(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <p className="text-[11px] text-gray-400 mt-1.5 border-t border-gray-100 pt-1.5">
          {Math.round((payload[1].value / payload[0].value) * 100)}% collected
        </p>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Filter state
  const [activePreset, setActivePreset] = useState(6);       // active quick preset (null = custom)
  const [fromMonth, setFromMonth]       = useState(monthsAgo(6));
  const [toMonth, setToMonth]           = useState(currentMonthStr());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker]     = useState(false);

  const fetchAnalytics = useCallback(async (from, to) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/billing/analytics", {
        params: { fromMonth: from, toMonth: to },
      });
      setData(res.data.data);
    } catch {
      setError("Failed to load analytics. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(fromMonth, toMonth); }, [fromMonth, toMonth, fetchAnalytics]);

  const applyPreset = (months) => {
    setActivePreset(months);
    setFromMonth(monthsAgo(months));
    setToMonth(currentMonthStr());
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const handleFromMonth = (val) => {
    setFromMonth(val);
    setActivePreset(null);
    setShowFromPicker(false);
  };

  const handleToMonth = (val) => {
    setToMonth(val);
    setActivePreset(null);
    setShowToPicker(false);
  };

  const { monthlyRevenue, collectionRate, paymentModes, topOutstanding, currentMonth } = data || {};
  const totalModeAmount = Object.values(paymentModes || {}).reduce((s, m) => s + m.amount, 0);

  // Angle X labels when showing many months (cramped on mobile)
  const xAxisAngle  = (monthlyRevenue?.length || 0) > 6 ? -35 : 0;
  const xAxisHeight = xAxisAngle !== 0 ? 48 : 30;

  // Friendly range label for header
  const rangeLabel = useMemo(() => {
    if (!fromMonth || !toMonth) return "";
    const from = new Date(fromMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    const to   = new Date(toMonth   + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    return fromMonth === toMonth ? from : `${from} – ${to}`;
  }, [fromMonth, toMonth]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Revenue, collections and payment trends</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">

          {/* Quick presets */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {PRESETS.map((p) => (
              <button
                key={p.months}
                onClick={() => applyPreset(p.months)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreset === p.months
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span className="text-gray-200 text-sm hidden sm:block">|</span>

          {/* Custom from/to month pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">From</span>
            <div className="relative">
              <button
                onClick={() => { setShowFromPicker((v) => !v); setShowToPicker(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  activePreset === null ? "border-gray-900 text-gray-900 bg-gray-50" : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <Calendar size={11} />
                {new Date(fromMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                <ChevronDown size={10} />
              </button>
              {showFromPicker && (
                <MonthDropdown
                  options={MONTH_OPTIONS}
                  selected={fromMonth}
                  onSelect={handleFromMonth}
                  onClose={() => setShowFromPicker(false)}
                  maxVal={toMonth}
                />
              )}
            </div>

            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">To</span>
            <div className="relative">
              <button
                onClick={() => { setShowToPicker((v) => !v); setShowFromPicker(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  activePreset === null ? "border-gray-900 text-gray-900 bg-gray-50" : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <Calendar size={11} />
                {new Date(toMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                <ChevronDown size={10} />
              </button>
              {showToPicker && (
                <MonthDropdown
                  options={MONTH_OPTIONS}
                  selected={toMonth}
                  onSelect={handleToMonth}
                  onClose={() => setShowToPicker(false)}
                  minVal={fromMonth}
                />
              )}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchAnalytics(fromMonth, toMonth)}
            disabled={loading}
            className="ml-auto w-8 h-8 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-40 flex-shrink-0"
          >
            <RefreshCw size={12} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-medium text-red-700 flex-1">{error}</span>
          <button onClick={() => fetchAnalytics(fromMonth, toMonth)} className="text-xs font-bold text-red-600">Retry</button>
        </div>
      )}

      {/* ── Summary cards — always 3 col (compact on mobile) ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          label="Billed"
          value={loading ? null : currentMonth?.billed}
          icon={<Wallet size={14} />}
          color="blue"
          sub={loading ? null : `${currentMonth?.billCount ?? 0} bills`}
        />
        <SummaryCard
          label="Collected"
          value={loading ? null : currentMonth?.collected}
          icon={<CheckCircle2 size={14} />}
          color="emerald"
          sub={
            loading || !currentMonth?.billed ? null
              : currentMonth.billed > 0
                ? `${Math.round((currentMonth.collected / currentMonth.billed) * 100)}% rate`
                : null
          }
        />
        <SummaryCard
          label="Outstanding"
          value={loading ? null : currentMonth?.outstanding}
          icon={<AlertCircle size={14} />}
          color={currentMonth?.outstanding > 0 ? "rose" : "emerald"}
          sub={rangeLabel}
        />
      </div>

      {/* ── Revenue trend chart ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-900">Revenue Trend</p>
          </div>
          <p className="text-xs text-gray-400 font-medium">{rangeLabel}</p>
        </div>

        {loading ? (
          <div className="h-48 sm:h-56 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : monthlyRevenue?.length > 0 ? (
          <div className="px-1 sm:px-2 pt-4 pb-1">
            {/* Mobile: 220px, desktop: 240px */}
            <ResponsiveContainer width="100%" height={typeof window !== "undefined" && window.innerWidth < 640 ? 200 : 240}>
              <BarChart
                data={monthlyRevenue}
                barCategoryGap="28%"
                barGap={2}
                margin={{ top: 0, right: 8, left: 0, bottom: xAxisAngle !== 0 ? 12 : 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  angle={xAxisAngle}
                  textAnchor={xAxisAngle !== 0 ? "end" : "middle"}
                  height={xAxisHeight}
                  interval={0}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, color: "#6b7280", paddingTop: 6 }}
                  iconSize={8}
                />
                <Bar dataKey="billed"    name="Billed"    fill="#e2e8f0" radius={[3, 3, 0, 0]} maxBarSize={40} />
                <Bar dataKey="collected" name="Collected" fill="#1e293b" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <BarChart2 size={28} className="text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">No billing data for this period</p>
          </div>
        )}
      </div>

      {/* ── Collection rate + payment modes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Collection rate */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-900">Collection Rate</p>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-8 w-24 bg-gray-100 rounded" />
              <div className="h-2.5 w-full bg-gray-100 rounded-full" />
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-black tabular-nums leading-none ${
                  collectionRate >= 80 ? "text-emerald-600"
                  : collectionRate >= 50 ? "text-amber-600"
                  : "text-red-600"
                }`}>
                  {collectionRate ?? 0}%
                </span>
                <span className="text-xs text-gray-400 font-medium mb-1 leading-tight">
                  of billed<br />collected
                </span>
              </div>
              <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
                    collectionRate >= 80 ? "bg-emerald-500"
                    : collectionRate >= 50 ? "bg-amber-400"
                    : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(collectionRate ?? 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {collectionRate >= 90 ? "Excellent — almost everything collected."
                  : collectionRate >= 70 ? "Good — a few bills to follow up."
                  : collectionRate >= 50 ? "Moderate — send payment reminders."
                  : "Needs attention — many bills unpaid."}
              </p>
              <Link
                to="/admin/outstanding"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
              >
                View outstanding <ArrowRight size={11} />
              </Link>
            </>
          )}
        </div>

        {/* Payment mode breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <IndianRupee size={14} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-900">How Customers Pay</p>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-100 rounded-full" />
                    <div className="h-4 w-20 bg-gray-100 rounded" />
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : totalModeAmount > 0 ? (
            <div className="space-y-3">
              {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
                const modeData = paymentModes?.[mode] || { count: 0, amount: 0 };
                const pct = totalModeAmount > 0
                  ? Math.round((modeData.amount / totalModeAmount) * 100) : 0;
                if (modeData.count === 0) return null;
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.light}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-gray-400">{pct}%</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700 tabular-nums">
                        ₹{fmt(modeData.amount)}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${cfg.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <IndianRupee size={24} className="text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">No payments in this period</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Top 5 outstanding ── */}
      {!loading && topOutstanding?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900">Top Outstanding</p>
            <Link
              to="/admin/outstanding"
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1 transition"
            >
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {topOutstanding.map((c, i) => (
              <div key={c.customerId?.toString()} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                <span className="text-xs font-black text-gray-300 w-4 flex-shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    ₹{fmt(c.amountPaid)} paid · ₹{fmt(c.totalAmount)} billed
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-black tabular-nums ${
                    c.outstanding > 5000 ? "text-red-600"
                    : c.outstanding > 1000 ? "text-amber-600"
                    : "text-gray-700"
                  }`}>
                    ₹{fmt(c.outstanding)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">due</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

// ─── MonthDropdown ────────────────────────────────────────────────────────────
function MonthDropdown({ options, selected, onSelect, onClose, minVal, maxVal }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden w-48">
        <div className="max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const disabled = (minVal && opt.val < minVal) || (maxVal && opt.val > maxVal);
            return (
              <button
                key={opt.val}
                onClick={() => !disabled && onSelect(opt.val)}
                disabled={disabled}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition ${
                  opt.val === selected
                    ? "bg-gray-900 text-white"
                    : disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub }) {
  const colors = {
    blue:    { bg: "bg-blue-50",    icon: "text-blue-500",    val: "text-gray-900" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", val: "text-gray-900" },
    rose:    { bg: "bg-rose-50",    icon: "text-rose-500",    val: "text-rose-600" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${c.bg} ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className={`text-lg sm:text-2xl font-black leading-none tabular-nums ${c.val}`}>
          {value === null || value === undefined
            ? <span className="inline-block w-14 h-5 bg-gray-100 rounded animate-pulse align-middle" />
            : `₹${fmt(value)}`
          }
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-1">{label}</p>
        {sub && value !== null && (
          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;