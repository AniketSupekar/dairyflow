/**
 * context/TenantContext.jsx
 *
 * Loads tenant settings once after login and makes them available
 * everywhere in the app via useTenant().
 *
 * Why context instead of fetching per-component?
 *   - Business name in page titles, sidebar, PDF previews
 *   - Logo in header, PDFs, any branded element
 *   - One API call total, not one per component
 *
 * Setup: wrap <App> or your router with <TenantProvider>
 *   (see App.jsx wiring note at bottom)
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getTenantSettings } from "../api/tenant.api";

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [tenant,  setTenant]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTenantSettings();
      setTenant(res.data.data);
    } catch (err) {
      // 401 = not logged in yet — expected, not an error worth surfacing
      if (err?.response?.status !== 401) {
        setError("Failed to load business settings.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount — AuthContext should be set up before this runs
  // If user isn't logged in, this silently does nothing (401 caught above)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchTenant();
    else setLoading(false);
  }, [fetchTenant]);

  /** Call after updating settings to sync context with DB */
  const refreshTenant = fetchTenant;

  /**
   * Optimistic update — updates context immediately for instant UI feedback.
   * Used by SettingsPage after a successful PATCH so the header/PDF preview
   * updates without waiting for a refetch.
   */
  const updateTenantLocally = useCallback((updates) => {
    setTenant((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <TenantContext.Provider
      value={{ tenant, loading, error, refreshTenant, updateTenantLocally }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside <TenantProvider>");
  return ctx;
};

/*
─────────────────────────────────────────────────────────────────────
WIRING — App.jsx or main.jsx:

import { TenantProvider } from "./context/TenantContext";

// Wrap your app:
<AuthProvider>
  <TenantProvider>
    <AppRouter />
  </TenantProvider>
</AuthProvider>
─────────────────────────────────────────────────────────────────────
*/