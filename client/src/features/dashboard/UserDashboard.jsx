import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axios";
import {
  ClipboardList, ArrowRight, MapPin, CheckCircle2,
  Truck, AlertCircle, ChevronRight,
} from "lucide-react";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const UserDashboard = () => {
  const { user } = useContext(AuthContext);

  const [stats, setStats] = useState({ deliveredToday: null, totalToday: null });
  const [laneNames, setLaneNames] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const assignedLanes = user?.assignedLanes || [];

  useEffect(() => {
    const fetchData = async () => {
      setStatsLoading(true);
      try {
        const [statsRes, lanesRes] = await Promise.allSettled([
          api.get("/deliveries/my-stats"),
          api.get("/lanes"),
        ]);
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data.data);
        }
        if (lanesRes.status === "fulfilled") {
          const allLanes = lanesRes.value.data.data;
          const myLanes = allLanes.filter((l) =>
            assignedLanes.some((id) => id.toString() === l._id.toString())
          );
          setLaneNames(myLanes.map((l) => l.name));
        }
      } catch (err) {
        console.error("UserDashboard fetch error:", err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const timeNow = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  const deliveryProgress = stats.totalToday > 0
    ? Math.round((stats.deliveredToday / stats.totalToday) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">{todayFormatted}</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium">{timeNow}</p>
          <div className="flex items-center gap-1.5 justify-end mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-600">On Duty</span>
          </div>
        </div>
      </div>

      {/* ── Primary CTA — dark only on this one card, intentional anchor ── */}
      <Link
        to="/user/deliveries"
        className="group block bg-gray-900 hover:bg-black rounded-2xl p-5 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Record Deliveries</p>
              <p className="text-xs text-white/50 mt-0.5">Mark today's delivery status</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition">
            <ChevronRight size={15} className="text-white" />
          </div>
        </div>

        {/* Progress bar — only shown once deliveries are started */}
        {!statsLoading && stats.totalToday > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">Today's progress</span>
              <span className="text-xs font-bold text-white">
                {stats.deliveredToday} / {stats.totalToday}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${deliveryProgress}%` }}
              />
            </div>
          </div>
        )}
      </Link>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Lanes */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <MapPin size={13} className="text-blue-500" />
            </div>
            <p className="text-xs font-semibold text-gray-500">My Lanes</p>
          </div>

          {assignedLanes.length === 0 ? (
            <p className="text-sm font-semibold text-gray-400">None assigned</p>
          ) : statsLoading ? (
            <div className="space-y-1.5">
              <div className="h-5 w-6 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 leading-none">{assignedLanes.length}</p>
              {laneNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {laneNames.map((name) => (
                    <span
                      key={name}
                      className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delivered today */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={13} className="text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-gray-500">Delivered</p>
          </div>

          {statsLoading ? (
            <div className="space-y-1.5">
              <div className="h-5 w-8 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {stats.deliveredToday ?? "—"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                {stats.totalToday > 0 ? `of ${stats.totalToday} recorded` : "today"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── No lanes warning ────────────────────────────────────────── */}
      {assignedLanes.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">
            No lanes assigned yet. Contact your admin to get started.
          </p>
        </div>
      )}

      {/* ── Delivery window + open link ─────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Truck size={14} className="text-gray-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Delivery Window</p>
            <p className="text-sm font-bold text-gray-800">5:00 AM – 9:00 AM</p>
          </div>
        </div>
        <Link
          to="/user/deliveries"
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
        >
          Open <ArrowRight size={12} />
        </Link>
      </div>

      {/* ── Daily checklist ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Daily Checklist
        </p>
        <div className="space-y-2.5">
          {[
            { label: "Select your lane before starting",     done: true  },
            { label: "Mark deliveries as you go",            done: false },
            { label: "Use 'Not Delivered' for missed stops", done: false },
            { label: "Mark 'Holiday' for customer holidays", done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border
                ${item.done ? "bg-emerald-500 border-emerald-500" : "border-gray-200 bg-white"}`}
              >
                {item.done && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p className={`text-xs ${item.done ? "text-gray-400 line-through" : "text-gray-600"}`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default UserDashboard;