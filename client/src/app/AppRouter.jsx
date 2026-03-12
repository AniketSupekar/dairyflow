import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

import Login               from "../features/auth/Login";
import RegisterPage        from "../features/auth/RegisterPage";
import SettingsPage        from "../features/settings/SettingsPage";
import ProtectedRoute      from "./ProtectedRoute";
import AdminLayout         from "../layouts/AdminLayout";
import UserLayout          from "../layouts/UserLayout";
import ProductList         from "../features/products/ProductList";
import LaneList            from "../features/lanes/LaneList";
import CustomerPage        from "../features/customers/CustomerPage";
import DeliveryBoyPage     from "../features/deliveryBoys/DeliveryBoyPage";
import DeliveryPage        from "../features/deliveries/DeliveryPage";
import BillingPage         from "../features/billing/BillingPage";
import AdminDashboard      from "../features/dashboard/AdminDashboard";
import UserDashboard       from "../features/dashboard/UserDashboard";
import OutstandingPage     from "../features/outstanding/OutstandingPage";
import BulkBillingPage     from "../features/bulkBilling/BulkBillingPage";
import DeliverySummaryPage from "../features/deliverySummary/DeliverySummaryPage";
import AnalyticsPage       from "../features/analytics/AnalyticsPage";

const HomeRedirect = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
    else if (user.role?.toLowerCase() === "admin") navigate("/admin", { replace: true });
    else navigate("/user", { replace: true });
  }, [user, navigate]);
  return null;
};

const RouterContent = () => (
  <Routes>
    {/* Public */}
    <Route path="/"         element={<HomeRedirect />} />
    <Route path="/login"    element={<Login />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Admin — protected */}
    <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
      <Route index                     element={<AdminDashboard />} />
      <Route path="products"           element={<ProductList />} />
      <Route path="lanes"              element={<LaneList />} />
      <Route path="customers"          element={<CustomerPage />} />
      <Route path="delivery-boys"      element={<DeliveryBoyPage />} />
      <Route path="deliveries"         element={<DeliveryPage />} />
      <Route path="delivery-summary"   element={<DeliverySummaryPage />} />
      <Route path="billing"            element={<BillingPage />} />
      <Route path="outstanding"        element={<OutstandingPage />} />
      <Route path="analytics"        element={<AnalyticsPage />} />
      <Route path="bulk-billing"       element={<BulkBillingPage />} />
      <Route path="settings"           element={<SettingsPage />} />
    </Route>

    {/* User — protected */}
    <Route path="/user" element={<ProtectedRoute role="user"><UserLayout /></ProtectedRoute>}>
      <Route index             element={<UserDashboard />} />
      <Route path="deliveries" element={<DeliveryPage />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<HomeRedirect />} />
  </Routes>
);

const AppRouter = () => (
  <BrowserRouter>
    <RouterContent />
  </BrowserRouter>
);

export default AppRouter;