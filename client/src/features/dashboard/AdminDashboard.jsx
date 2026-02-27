import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axios";
import {
  Box, MapPin, Users, Truck, ClipboardList, Wallet,
  ArrowRight, ArrowUpRight, CheckCircle2, AlertCircle,
  RefreshCw, TrendingUp,
} from "lucide-react";

// ─── Module definitions ───────────────────────────────────────────────────────
const modules = [
  { name: "Products",      to: "/admin/products",      icon: Box,           desc: "Products & pricing",      color: "bg-orange-50 text-orange-500" },
  { name: "Lanes",         to: "/admin/lanes",         icon: MapPin,        desc: "Routes & zones",          color: "bg-blue-50 text-blue-500" },
  { name: "Customers",     to: "/admin/customers",     icon: Users,         desc: "Subscribers & plans",     color: "bg-violet-50 text-violet-500" },
  { name: "Delivery Team", to: "/admin/delivery-boys", icon: Truck,         desc: "Staff & assignments",     color: "bg-teal-50 text-teal-500" },
  { name: "Deliveries",    to: "/admin/deliveries",    icon: ClipboardList, desc: "Daily delivery records",  color: "bg-emerald-50 text-emerald-600" },
  { name: "Financials",    to: "/admin/billing",       icon: Wallet,        desc: "Bills & payments",        color: "bg-rose-50 text-rose-500" },
];

// ─── Quick actions ────────────────────────────────────────────────────────────
const quickActions = [
  { label: "Record deliveries", sub: "Mark today's delivery status",  to: "/admin/deliveries",    dot: "bg-emerald-400" },
  { label: "Generate a bill",   sub: "Create customer invoice",       to: "/admin/billing",       dot: "bg-rose-400" },
  { label: "Add a customer",    sub: "New subscriber signup",         to: "/admin/customers",     dot: "bg-violet-400" },
];

// ─── Accent map for stat cards ────────────────────────────────────────────────
const accentMap = {
  violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-500" },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalCustomers: null, totalLanes: null });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Live clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const [custRes, laneRes] = await Promise.allSettled([
        api.get("/customers"),
        api.get("/lanes"),
      ]);
      setStats({
        totalCustomers: custRes.status === "fulfilled" ? custRes.value.data.data.length : null,
        totalLanes: laneRes.status === "fulfilled" ? laneRes.value.data.data.length : null,
      });
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const dateStr = time.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const shortDate = time.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">
            {getGreeting()}{user?.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1">{dateStr}</p>
        </div>
        <Link
          to="/admin/deliveries"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex-shrink-0"
        >
          <ClipboardList size={13} />
          Today's Deliveries
        </Link>
      </div>

      {/* ── Stat band ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Customers"   value={stats.totalCustomers}
          loading={statsLoading}    icon={<Users size={14} />}
          accent="violet"           to="/admin/customers"
        />
        <StatCard
          label="Active Lanes"      value={stats.totalLanes}
          loading={statsLoading}    icon={<MapPin size={14} />}
          accent="blue"             to="/admin/lanes"
        />
        <StatCard
          label="Deliveries Today"  value="—"
          loading={false}           icon={<CheckCircle2 size={14} />}
          accent="emerald"          to="/admin/deliveries"
        />
        <StatCard
          label="Pending Billing"   value="—"
          loading={false}           icon={<TrendingUp size={14} />}
          accent="rose"             to="/admin/billing"
        />
      </div>

      {/* Stats error */}
      {statsError && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1">Some stats couldn't load.</span>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* ── Body: 2-col modules + right sidebar ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Modules — 2/3 width */}
        <div className="lg:col-span-2 space-y-2.5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-0.5">
            Modules
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.name}
                  to={mod.to}
                  className="group bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 leading-none">{mod.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{mod.desc}</p>
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-gray-200 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right sidebar — 1/3 width */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-0.5">
            Overview
          </p>

          {/* Live clock card */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
              Right Now
            </p>
            <p className="text-3xl font-bold text-white tracking-tight leading-none">
              {timeStr}
            </p>
            <p className="text-xs text-white/40 mt-1.5">{shortDate}</p>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/40 font-medium">All systems operational</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-700">Quick Actions</p>
            </div>
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition group"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${action.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 leading-none">{action.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{action.sub}</p>
                </div>
                <ArrowUpRight
                  size={12}
                  className="text-gray-300 group-hover:text-gray-600 transition flex-shrink-0"
                />
              </Link>
            ))}
          </div>

          {/* Delivery window */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Truck size={13} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                  Delivery Window
                </p>
                <p className="text-sm font-bold text-emerald-800 mt-0.5">5:00 AM – 9:00 AM</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, loading, icon, accent, to }) {
  const a = accentMap[accent] || accentMap.blue;
  const inner = (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.bg} ${a.text}`}>
          {icon}
        </div>
        <ArrowRight size={11} className="text-gray-200 group-hover:text-gray-400 transition" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">
        {loading
          ? <span className="inline-block w-10 h-6 bg-gray-100 rounded-lg animate-pulse" />
          : (value ?? "—")
        }
      </p>
      <p className="text-[11px] text-gray-500 font-medium mt-1.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default AdminDashboard;