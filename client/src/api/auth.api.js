/**
 * api/auth.api.js
 *
 * Add the register call to your existing auth API file.
 * If you already have login() in a separate file, just add registerTenant() to it.
 */

import api from "./axios";

/** Login existing user */
export const login = (credentials) =>
  api.post("/auth/login", credentials);

/**
 * Self-serve tenant registration.
 * Creates new Tenant + admin User, returns JWT.
 */
export const registerTenant = (data) =>
  api.post("/auth/register", data);