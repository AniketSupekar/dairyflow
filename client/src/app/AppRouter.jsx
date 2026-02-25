import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

import Login from "../features/auth/Login";
import ProtectedRoute from "./ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import UserLayout from "../layouts/UserLayout";
import ProductList from "../features/products/ProductList";
import LaneList from "../features/lanes/LaneList";
import CustomerPage from "../features/customers/CustomerPage";
import DeliveryBoyPage from "../features/deliveryBoys/DeliveryBoyPage";
import DeliveryPage from "../features/deliveries/DeliveryPage";
import BillingPage from "../features/billing/BillingPage";
import AdminDashboard from "../features/dashboard/AdminDashboard";

// ================= HomeRedirect =================
const HomeRedirect = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    } else if (user.role?.toLowerCase() === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/user", { replace: true });
    }
  }, [user, navigate]);

  return null;
};

// ================= Dashboards =================
// const AdminDashboard = () => <h1 className="p-4">Admin Dashboard</h1>;
const UserDashboard = () => <h1 className="p-4">Delivery Screen</h1>;

// ================= Router Wrapper =================
const RouterContent = () => {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="lanes" element={<LaneList />} />
        <Route path="customers" element={<CustomerPage />} />
        <Route path="delivery-boys" element={<DeliveryBoyPage />} />
        <Route path="deliveries" element={<DeliveryPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>

      {/* USER ROUTES */}
      {/* USER ROUTES */}
      <Route
        path="/user"
        element={
          <ProtectedRoute role="user">
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DeliveryPage />} />
      </Route>


      {/* Fallback */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

// ================= AppRouter =================
const AppRouter = () => {
  return (
    <BrowserRouter>
      <RouterContent />
    </BrowserRouter>
  );
};

export default AppRouter;