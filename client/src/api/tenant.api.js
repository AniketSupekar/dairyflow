/**
 * api/tenant.api.js
 *
 * All API calls related to tenant settings.
 * Imported by TenantContext and SettingsPage.
 */

import api from "./axios";

/** Fetch the current tenant's settings */
export const getTenantSettings = () =>
  api.get("/tenant/settings");

/**
 * Update profile fields (name, phone, address, invoicePrefix)
 * @param {object} data - partial object of fields to update
 */
export const updateTenantSettings = (data) =>
  api.patch("/tenant/settings", data);

/**
 * Upload logo — must send as FormData with field name "logo"
 * @param {File} file
 * @param {function} onUploadProgress - optional (percent) => void
 */
export const uploadTenantLogo = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("logo", file);

  return api.post("/tenant/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onUploadProgress
      ? (e) => onUploadProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  });
};

/** Remove custom logo — reverts to app default */
export const deleteTenantLogo = () =>
  api.delete("/tenant/logo");