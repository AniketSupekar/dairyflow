import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { LayoutDashboard, ClipboardList, LogOut, Menu, X, ChevronRight } from "lucide-react";
import logo from "../assets/logo.png";

// ────────────────────────────────────────────────────────────────────────────
// 📁 Logo placement: put your logo.png at  client/src/assets/logo.png
// ────────────────────────────────────────────────────────────────────────────

const navItems = [
  { name: "Dashboard",      to: "/user",             icon: LayoutDashboard, end: true },
  { name: "My Deliveries",  to: "/user/deliveries",  icon: ClipboardList },
];

const UserLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();

  const handleLogout = () => { setConfirmLogout(false); logout(); };

  const SidebarContent = ({ onNav }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Siddhivinayak Dairy"
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Siddhivinayak Dairy</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Delivery Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
          My Work
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight size={12} className="text-white/60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Today card */}
      <div className="px-3 pb-4">
        <div className="bg-gray-50 rounded-xl px-3 py-3 border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Today</p>
          <p className="text-xs text-gray-700 font-semibold">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      {/* User + Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-gray-100 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">
                {(user.name || user.phone || "U")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user.name || "Delivery Boy"}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.phone || ""}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
        <SidebarContent onNav={undefined} />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-40 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={18} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="Siddhivinayak Dairy" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-sm font-bold text-gray-900">Siddhivinayak Dairy</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100">
          <span className="text-xs font-bold text-gray-600">
            {(user?.name || user?.phone || "U")[0].toUpperCase()}
          </span>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-white h-full shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <X size={15} className="text-gray-500" />
            </button>
            <SidebarContent onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 min-h-screen">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirm */}
      {confirmLogout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
              <LogOut size={18} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Sign out?</h3>
            <p className="text-sm text-gray-600 mt-1">You'll be logged out of your delivery panel.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLayout;