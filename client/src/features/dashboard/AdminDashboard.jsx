import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useTenant } from "../../hooks/useTenant";
import api from "../../api/axios";
import {
  Box, MapPin, Users, Truck, ClipboardList, Wallet,
  ArrowRight, ArrowUpRight, CheckCircle2, AlertCircle,
  RefreshCw, TrendingUp, ChevronRight, BarChart2,
  Clock, XCircle, Umbrella, Settings,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const modules = [
  { name: "Products",      to: "/admin/products",      icon: Box,           desc: "Products & pricing",     color: "bg-orange-50 text-orange-500"  },
  { name: "Lanes",         to: "/admin/lanes",         icon: MapPin,        desc: "Routes & zones",         color: "bg-blue-50 text-blue-500"      },
  { name: "Customers",     to: "/admin/customers",     icon: Users,         desc: "Subscribers & plans",    color: "bg-violet-50 text-violet-500"  },
  { name: "Delivery Team", to: "/admin/delivery-boys", icon: Truck,         desc: "Staff & assignments",    color: "bg-teal-50 text-teal-500"      },
  { name: "Deliveries",    to: "/admin/deliveries",    icon: ClipboardList, desc: "Daily delivery records", color: "bg-emerald-50 text-emerald-600" },
  { name: "Financials",    to: "/admin/billing",       icon: Wallet,        desc: "Bills & payments",       color: "bg-rose-50 text-rose-500"      },
];

const accentStyles = {
  violet:  { icon: "bg-violet-50 text-violet-500"  },
  blue:    { icon: "bg-blue-50 text-blue-500"      },
  emerald: { icon: "bg-emerald-50 text-emerald-500"},
  rose:    { icon: "bg-rose-50 text-rose-500"      },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user }   = useContext(AuthContext);
  const { tenant } = useTenant();

  // Stat cards
  const [stats, setStats] = useState({
    totalCustomers: null, totalLanes: null,
    deliveriesToday: null, pendingBills: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState(false);

  // Delivery summary widget
  const [summaryData,    setSummaryData]    = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await api.get("/billing/dashboard-stats");
      const d   = res.data.data;
      setStats({
        totalCustomers:  d.totalCustomers,
        totalLanes:      d.totalLanes,
        deliveriesToday: d.deliveriesToday,
        pendingBills:    d.pendingBills,
      });
    } catch { setStatsError(true); }
    finally  { setStatsLoading(false); }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res   = await api.get("/deliveries/daily-summary", { params: { date: today } });
      setSummaryData(res.data.data);
    } catch { /* silent — widget won't show */ }
    finally { setSummaryLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    fetchSummary();
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const hasPendingBills = !statsLoading && stats.pendingBills > 0;

  // Show setup prompt if tenant hasn't filled in their profile yet
  const needsSetup = tenant && (!tenant.address || !tenant.logoUrl);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Setup nudge — shown until tenant completes their profile ── */}
      {needsSetup && (
        <Link
          to="/admin/settings"
          className="group flex items-center gap-3.5 bg-amber-50 border border-amber-100
            hover:border-amber-200 rounded-2xl px-5 py-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Settings size={15} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 leading-none">
              Complete your business profile
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Add your logo and address — they'll appear on every PDF bill
            </p>
          </div>
          <ChevronRight size={15} className="text-amber-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </Link>
      )}

      {/* ── 1. Header & Greeting ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{today}</p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
          {tenant?.businessName && (
            <p className="text-xs text-gray-400 mt-1 font-medium">{tenant.businessName}</p>
          )}
        </div>
        <Link
          to="/admin/deliveries"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white
            text-xs font-bold px-4 py-2.5 rounded-xl transition flex-shrink-0"
        >
          <ClipboardList size={13} />
          Today's Deliveries
        </Link>
      </div>

      {/* ── 2. Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Customers"       value={stats.totalCustomers}  loading={statsLoading} icon={Users}        accent="violet"  to="/admin/customers"        />
        <StatCard label="Active Lanes"    value={stats.totalLanes}      loading={statsLoading} icon={MapPin}       accent="blue"    to="/admin/lanes"             />
        <StatCard label="Delivered Today" value={stats.deliveriesToday} loading={statsLoading} icon={CheckCircle2} accent="emerald" to="/admin/delivery-summary"  />
        <StatCard label="Pending Bills"   value={stats.pendingBills}    loading={statsLoading} icon={TrendingUp}   accent="rose"    to="/admin/outstanding" alert={hasPendingBills} />
      </div>

      {/* Stats error */}
      {statsError && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1">Stats couldn't load.</span>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* ── 3. Today's Progress ── */}
      <div className="space-y-3">
        <SectionLabel>Today's Progress</SectionLabel>
        <DeliveryWidget data={summaryData} loading={summaryLoading} />
      </div>

      {/* ── 4. Pending Bills Alert ── */}
      {hasPendingBills && (
        <Link
          to="/admin/outstanding"
          className="group flex items-center gap-3.5 bg-rose-50 border border-rose-100
            hover:border-rose-200 rounded-2xl px-5 py-4 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={15} className="text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-700 leading-none">
              {stats.pendingBills} unpaid bill{stats.pendingBills !== 1 ? "s" : ""} need attention
            </p>
            <p className="text-xs text-rose-400 mt-1">Collect payments to keep accounts up to date</p>
          </div>
          <ChevronRight size={15} className="text-rose-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </Link>
      )}

      {/* ── 5. Modules ── */}
      <div className="space-y-3">
        <SectionLabel>Modules</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.name}
                to={mod.to}
                className="group bg-white border border-gray-100 rounded-2xl px-4 py-3.5
                  flex items-center gap-3.5 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 leading-none">{mod.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{mod.desc}</p>
                </div>
                <ArrowRight size={13} className="text-gray-200 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 6. Quick Actions ── */}
      <div className="space-y-3">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Record deliveries", sub: "Mark today's status",  to: "/admin/deliveries",       icon: ClipboardList, color: "bg-emerald-50 text-emerald-600" },
            { label: "Delivery summary",  sub: "Lane-wise progress",   to: "/admin/delivery-summary", icon: BarChart2,     color: "bg-blue-50 text-blue-500"       },
            { label: "Generate a bill",   sub: "Create invoice",       to: "/admin/billing",          icon: Wallet,        color: "bg-rose-50 text-rose-500"       },
            { label: "Add customer",      sub: "New subscriber",       to: "/admin/customers",        icon: Users,         color: "bg-violet-50 text-violet-500"   },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                to={a.to}
                className="group flex items-center gap-3.5 bg-white border border-gray-100
                  rounded-2xl px-4 py-3.5 hover:bg-gray-50/80 transition"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-none">{a.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{a.sub}</p>
                </div>
                <ArrowUpRight size={13} className="text-gray-200 group-hover:text-gray-500 transition flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 7. Delivery Window ── */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Window</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">5:00 AM – 9:00 AM</p>
        </div>
        <Link
          to="/admin/deliveries"
          className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition flex items-center gap-1 flex-shrink-0"
        >
          Open <ArrowRight size={11} />
        </Link>
      </div>

    </div>
  );
};

// ─── Delivery progress widget ─────────────────────────────────────────────────
function DeliveryWidget({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse space-y-2">
        <div className="h-3 w-32 bg-gray-100 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { lanes, summary } = data;
  const allDone = summary.completeLanes === summary.totalLanes && summary.totalLanes > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-700">Today's Progress</p>
          {allDone && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              All done
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
          <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={10} />{summary.totalDelivered}</span>
          <span className="flex items-center gap-1 text-red-400"><XCircle size={10} />{summary.totalNotDelivered}</span>
          <span className="flex items-center gap-1 text-blue-400"><Umbrella size={10} />{summary.totalHoliday}</span>
          {summary.totalNotRecorded > 0 && (
            <span className="flex items-center gap-1 text-amber-500"><Clock size={10} />{summary.totalNotRecorded}</span>
          )}
        </div>
      </div>

      {/* Lane rows */}
      <div className="divide-y divide-gray-50">
        {lanes.slice(0, 6).map((lane) => {
          const recorded = lane.delivered + lane.notDelivered + lane.holiday;
          const pct = lane.totalCustomers > 0
            ? Math.round((recorded / lane.totalCustomers) * 100)
            : 0;

          return (
            <Link
              key={lane.laneId.toString()}
              to="/admin/delivery-summary"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition group"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                lane.isComplete ? "bg-emerald-400" : recorded > 0 ? "bg-amber-400" : "bg-gray-200"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{lane.laneName}</p>
                  <p className="text-[10px] font-bold text-gray-400 flex-shrink-0 ml-2">
                    {recorded}/{lane.totalCustomers}
                  </p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      lane.isComplete ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <ArrowRight size={11} className="text-gray-200 group-hover:text-gray-400 transition flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <Link
        to="/admin/delivery-summary"
        className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-gray-50
          text-xs font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50/60 transition"
      >
        View full summary <ArrowRight size={11} />
      </Link>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, loading, icon: Icon, accent, to, alert }) {
  const a = accentStyles[accent] || accentStyles.blue;
  const inner = (
    <div className={`relative bg-white border rounded-2xl p-4 hover:shadow-sm transition-all
      group cursor-pointer overflow-hidden
      ${alert
        ? "border-rose-200 hover:border-rose-300"
        : "border-gray-100 hover:border-gray-200"}`}
    >
      <div className={`absolute -top-5 -right-5 w-16 h-16 rounded-full opacity-25 ${a.icon.split(" ")[0]}`} />
      <div className="relative flex flex-col gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.icon}`}>
          <Icon size={14} />
        </div>
        <div>
          <p className={`text-2xl font-bold leading-none ${alert ? "text-rose-600" : "text-gray-900"}`}>
            {loading
              ? <span className="inline-block w-10 h-6 bg-gray-100 rounded-lg animate-pulse align-middle" />
              : (value ?? "—")
            }
          </p>
          <p className="text-[11px] text-gray-500 font-medium mt-1.5 leading-none">{label}</p>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-0.5">
      {children}
    </p>
  );
}

export default AdminDashboard;