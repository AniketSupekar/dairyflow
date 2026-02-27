import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ClipboardList, ArrowRight, MapPin, CheckCircle2, Sun, Moon, Truck } from "lucide-react";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", icon: <Sun size={14} className="text-amber-500" /> };
  if (h < 17) return { text: "Good afternoon", icon: <Sun size={14} className="text-orange-400" /> };
  return { text: "Good evening", icon: <Moon size={14} className="text-indigo-400" /> };
};

const UserDashboard = () => {
  const { user } = useContext(AuthContext);
  const greeting = getGreeting();

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const timeNow = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  // Assigned lanes from user context (array of lane IDs)
  const assignedLanes = user?.assignedLanes || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          {todayFormatted}
        </p>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">
            {greeting.text}{user?.name ? `, ${user.name}` : ""} 👋
          </h1>
        </div>
        <p className="text-sm text-gray-600 mt-0.5">
          Ready for today's deliveries? Here's your overview.
        </p>
      </div>

      {/* ── Today's Status Card ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Shift Status</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-white">On Duty</p>
            </div>
            <p className="text-xs text-white/50">Logged in · {timeNow}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">Delivery Window</p>
            <p className="text-sm font-bold text-white">5:00 AM – 9:00 AM</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">Assigned Lanes</p>
            <p className="text-sm font-bold text-white">
              {assignedLanes.length > 0 ? `${assignedLanes.length} lane${assignedLanes.length > 1 ? "s" : ""}` : "Check with admin"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Action ────────────────────────────────────────────────────── */}
      <Link
        to="/user/deliveries"
        className="group flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">My Deliveries</p>
            <p className="text-xs text-gray-500 mt-0.5">Record and update today's delivery status</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>

      {/* ── Info Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <MapPin size={15} className="text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">
            {assignedLanes.length > 0 ? assignedLanes.length : "—"}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Assigned Lanes</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">—</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Delivered Today</p>
        </div>
      </div>

      {/* ── Helpful Tips ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Daily Checklist</h3>
        <div className="space-y-3">
          {[
            { label: "Select your lane before starting",       done: true  },
            { label: "Mark deliveries as you go",              done: false },
            { label: "Use 'Not Delivered' for missed stops",   done: false },
            { label: "Mark 'Holiday' for customer holidays",   done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                item.done ? "bg-emerald-100" : "bg-gray-100"
              }`}>
                {item.done && <CheckCircle2 size={10} className="text-emerald-600" />}
              </div>
              <p className={`text-xs leading-relaxed ${item.done ? "text-gray-400 line-through" : "text-gray-600"}`}>
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