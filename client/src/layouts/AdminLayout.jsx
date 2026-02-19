import { Outlet, NavLink } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  Home,
  Box,
  MapPin,
  Users,
  Truck,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const AdminLayout = () => {
  const { logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const navItems = [
    { name: "Dashboard", to: "/admin", icon: <Home size={18} /> },
    { name: "Products", to: "/admin/products", icon: <Box size={18} /> },
    { name: "Lanes", to: "/admin/lanes", icon: <MapPin size={18} /> },
    { name: "Customers", to: "/admin/customers", icon: <Users size={18} /> },
    { name: "Delivery Boys", to: "/admin/delivery-boys", icon: <Truck size={18} /> },
    { name: "Deliveries", to: "/admin/deliveries", icon: <FileText size={18} /> },
    { name: "Billing", to: "/admin/billing", icon: <FileText size={18} /> },
    { name: "Payments", to: "/admin/payments", icon: <CreditCard size={18} /> },
  ];

  const handleLogout = () => {
    setConfirmLogout(false);
    logout();
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          Dairy Admin
        </h2>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive
                    ? "bg-blue-100 text-blue-600 font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setConfirmLogout(true)}
          className="mt-6 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center z-40">
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Dairy Admin</h2>
        <button onClick={() => setConfirmLogout(true)}>
          <LogOut size={20} className="text-red-500" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="w-64 bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Menu</h2>
              <button onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg ${
                      isActive
                        ? "bg-blue-100 text-blue-600 font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 pt-20 md:pt-8 md:p-8 min-h-screen">
        <Outlet />
      </main>

      {/* Logout Confirmation Modal */}
      {confirmLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80">
            <h3 className="text-lg font-semibold text-gray-800">
              Confirm Logout
            </h3>
            <p className="text-gray-500 text-sm mt-2">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmLogout(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
