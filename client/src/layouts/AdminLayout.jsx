import { Outlet, Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const AdminLayout = () => {
  const { logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex md:w-64 bg-white shadow-md p-4 flex-col">
        <h2 className="text-xl font-bold mb-6">Dairy Admin</h2>

        <nav className="flex flex-col gap-3">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/lanes">Lanes</Link>
          <Link to="/admin/customers">Customers</Link>
          <Link to="/admin/delivery-boys">Delivery Boys</Link>
          <Link to="/admin/deliveries">Deliveries</Link>
          <Link to="/admin/payments">Payments</Link>
          <Link to="/admin/billing">Billing</Link>
        </nav>

        <button
          onClick={logout}
          className="mt-auto bg-red-500 text-white py-2 rounded"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-md flex justify-around py-2">
        <Link to="/admin">Home</Link>
        <Link to="/admin/customers">Customers</Link>
        <Link to="/admin/deliveries">Deliveries</Link>
      </nav>

    </div>
  );
};

export default AdminLayout;