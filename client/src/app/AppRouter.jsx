import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
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
import PaymentPage from "../features/payments/PaymentPage";


const Dashboard = () => <h1 className="p-4">Admin Dashboard</h1>;
const UserHome = () => <h1 className="p-4">User Panel</h1>;

const AppRouter = () => {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        {/* Root Redirect */}
        <Route
          path="/"
          element={
            user ? (
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/user" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            user ? (
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/user" />
              )
            ) : (
              <Login />
            )
          }
        />

        {/* ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="lanes" element={<LaneList />} />
          <Route path="customers" element={<CustomerPage />} />
          <Route path="delivery-boys" element={<DeliveryBoyPage />} />
          <Route path="deliveries" element={<DeliveryPage />} />
          <Route path="/admin/billing" element={<BillingPage />} />
          <Route path="payments" element={<PaymentPage />} />
        </Route>

        {/* USER ROUTES */}
        <Route
          path="/user"
          element={
            <ProtectedRoute role="user">
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserHome />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;