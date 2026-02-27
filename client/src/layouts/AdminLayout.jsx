import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  LayoutDashboard, Box, MapPin, Users, Truck,
  ClipboardList, Wallet, LogOut, Menu, X, ChevronRight,
} from "lucide-react";
import logo from "../assets/logo.png";

// ────────────────────────────────────────────────────────────────────────────
// 📁 Logo placement: put your logo.png at  client/src/assets/logo.png
// ────────────────────────────────────────────────────────────────────────────

const navItems = [
  { name: "Dashboard",     to: "/admin",               icon: LayoutDashboard, end: true },
  { name: "Products",      to: "/admin/products",       icon: Box },
  { name: "Lanes",         to: "/admin/lanes",          icon: MapPin },
  { name: "Customers",     to: "/admin/customers",      icon: Users },
  { name: "Delivery Team", to: "/admin/delivery-boys",  icon: Truck },
  { name: "Deliveries",    to: "/admin/deliveries",     icon: ClipboardList },
  { name: "Financials",    to: "/admin/billing",        icon: Wallet },
];

const AdminLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();

  const handleLogout = () => { setConfirmLogout(false); logout(); };

  const SidebarContent = ({ onNav }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Siddhivinayak Dairy"
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold text-gray-900 leading-none">Siddhivinayak Dairy</p>
            <p className="text-[10px] text-gray-500 font-medium mt-1">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
          Operations
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

      {/* User + Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-gray-100 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">
                {(user.name || user.phone || "A")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user.name || "Admin"}</p>
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
            {(user?.name || user?.phone || "A")[0].toUpperCase()}
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
      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="p-5 md:p-10 min-h-screen">
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
            <p className="text-sm text-gray-600 mt-1">You'll need to log in again to access the dashboard.</p>
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

export default AdminLayout;