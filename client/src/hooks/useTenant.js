/**
 * hooks/useTenant.js
 *
 * Re-exports useTenant from TenantContext for cleaner import paths.
 *
 * Usage in any component:
 *   import { useTenant } from "../../hooks/useTenant";
 *   const { tenant, loading } = useTenant();
 *   <h1>{tenant?.businessName}</h1>
 */

export { useTenant } from "../context/TenantContext";