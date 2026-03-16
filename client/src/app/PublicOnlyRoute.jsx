/**
 * app/PublicOnlyRoute.jsx
 *
 * Wraps public pages (/login, /register) that authenticated users
 * should never see. If a logged-in user lands here, redirect them
 * straight to their dashboard — same UX as Gmail, Notion, etc.
 *
 * Usage in AppRouter:
 *   <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
 *   <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
 */

import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  // Wait for AuthContext to finish checking localStorage token
  if (loading) return null;

  // Already logged in — bounce to correct dashboard
  if (user) {
    const dest = user.role?.toLowerCase() === "admin" ? "/admin" : "/user";
    return <Navigate to={dest} replace />;
  }

  return children;
}