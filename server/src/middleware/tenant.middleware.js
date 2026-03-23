/**
 * middleware/tenant.middleware.js
 *
 * Loads tenant into req.tenant on every protected request.
 * Uses field projection — only fetches what controllers actually need.
 * Smaller document = faster network transfer from Atlas + less memory.
 *
 * Fields included:
 *   - Core identity (name, contactName, phone, email, address)
 *   - Branding (logoUrl, invoicePrefix, upiId) — needed for PDFs + WhatsApp
 *   - Subscription (plan, trialEndsAt, isActive) — needed for gating
 *
 * Fields excluded:
 *   - logoPublicId — only needed in tenant.controller.js for Cloudinary deletion
 *     that controller does its own findById() so no issue
 */

const Tenant = require("../modules/tenants/tenant.model");
const { errorResponse } = require("../utils/response.util");

// Only fetch fields that controllers + middleware actually use
// logoPublicId excluded — tenant.controller fetches it directly when needed
const TENANT_PROJECTION =
  "name contactName phone email address logoUrl invoicePrefix upiId plan trialEndsAt isActive";

const tenantMiddleware = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return errorResponse(res, "Tenant context missing from token", 401);
    }

    const tenant = await Tenant
      .findById(req.tenantId)
      .select(TENANT_PROJECTION)
      .lean();

    if (!tenant) {
      return errorResponse(res, "Tenant account not found", 404);
    }

    if (!tenant.isActive) {
      return errorResponse(
        res,
        "Your account has been deactivated. Please contact support.",
        403
      );
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = tenantMiddleware;