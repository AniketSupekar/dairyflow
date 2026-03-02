import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axios";
import {
  Box, MapPin, Users, Truck, ClipboardList, Wallet,
  ArrowRight, ArrowUpRight, CheckCircle2, AlertCircle,
  RefreshCw, TrendingUp, ChevronRight,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const modules = [
  { name: "Products", to: "/admin/products", icon: Box, desc: "Products & pricing", color: "bg-orange-50 text-orange-500" },
  { name: "Lanes", to: "/admin/lanes", icon: MapPin, desc: "Routes & zones", color: "bg-blue-50 text-blue-500" },
  { name: "Customers", to: "/admin/customers", icon: Users, desc: "Subscribers & plans", color: "bg-violet-50 text-violet-500" },
  { name: "Delivery Team", to: "/admin/delivery-boys", icon: Truck, desc: "Staff & assignments", color: "bg-teal-50 text-teal-500" },
  { name: "Deliveries", to: "/admin/deliveries", icon: ClipboardList, desc: "Daily delivery records", color: "bg-emerald-50 text-emerald-600" },
  { name: "Financials", to: "/admin/billing", icon: Wallet, desc: "Bills & payments", color: "bg-rose-50 text-rose-500" },
];

const accentStyles = {
  violet: { icon: "bg-violet-50 text-violet-500" },
  blue: { icon: "bg-blue-50 text-blue-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-500" },
  rose: { icon: "bg-rose-50 text-rose-500" },
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

  const [stats, setStats] = useState({
    totalCustomers: null, totalLanes: null,
    deliveriesToday: null, pendingBills: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await api.get("/billing/dashboard-stats");
      const d = res.data.data;
      setStats({
        totalCustomers: d.totalCustomers,
        totalLanes: d.totalLanes,
        deliveriesToday: d.deliveriesToday,
        pendingBills: d.pendingBills,
      });
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const hasPendingBills = !statsLoading && stats.pendingBills > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{today}</p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
        </div>
        <Link
          to="/admin/deliveries"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex-shrink-0"
        >
          <ClipboardList size={13} />
          Today's Deliveries
        </Link>
      </div>

      {/* ── 4 stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Customers" value={stats.totalCustomers} loading={statsLoading} icon={Users} accent="violet" to="/admin/customers" />
        <StatCard label="Active Lanes" value={stats.totalLanes} loading={statsLoading} icon={MapPin} accent="blue" to="/admin/lanes" />
        <StatCard label="Delivered Today" value={stats.deliveriesToday} loading={statsLoading} icon={CheckCircle2} accent="emerald" to="/admin/deliveries" />
        <StatCard label="Pending Bills" value={stats.pendingBills} loading={statsLoading} icon={TrendingUp} accent="rose" to="/admin/billing" alert={hasPendingBills} />
      </div>

      {/* Stats error */}
      {statsError && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1">Stats couldn't load.</span>
          <button onClick={fetchStats} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition">
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}


      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Modules grid — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <SectionLabel>Modules</SectionLabel>
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
                  <ArrowRight size={13} className="text-gray-200 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Pending bills alert banner ────────────────────────────────────── */}
        {hasPendingBills && (
          <Link
            to="/admin/billing"
            className="group flex items-center gap-3.5 bg-rose-50 border border-rose-100 hover:border-rose-200 rounded-2xl px-5 py-4 transition-all"
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

        {/* Quick actions — 1 col */}
        <div className="space-y-3">
          <SectionLabel>Quick Actions</SectionLabel>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
            {[
              { label: "Record deliveries", sub: "Mark today's status", to: "/admin/deliveries", icon: ClipboardList, color: "bg-emerald-50 text-emerald-600" },
              { label: "Generate a bill", sub: "Create invoice", to: "/admin/billing", icon: Wallet, color: "bg-rose-50 text-rose-500" },
              { label: "Add customer", sub: "New subscriber", to: "/admin/customers", icon: Users, color: "bg-violet-50 text-violet-500" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50/80 transition"
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

          {/* Delivery window strip */}
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
      </div>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, loading, icon: Icon, accent, to, alert }) {
  const a = accentStyles[accent] || accentStyles.blue;

  const inner = (
    <div className={`relative bg-white border rounded-2xl p-4 hover:shadow-sm transition-all group cursor-pointer overflow-hidden
      ${alert ? "border-rose-200 hover:border-rose-300" : "border-gray-100 hover:border-gray-200"}`}
    >
      {/* Subtle depth circle */}
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

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-0.5">
      {children}
    </p>
  );
}

export default AdminDashboard;