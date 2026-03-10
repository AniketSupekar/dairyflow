/**
 * middleware/tenant.middleware.js
 *
 * Loads the full tenant document into req.tenant on every protected request.
 * Controllers, PDF builder, and any util that needs dairy info reads from
 * req.tenant — zero hardcoded dairy values anywhere in the codebase.
 *
 * Placement: add AFTER authMiddleware in app.js (authMiddleware sets req.tenantId).
 *
 * Future: add Redis cache here — `await redis.get(tenantId)` before DB hit.
 * Zero controller changes needed when that happens.
 */

const Tenant = require("../modules/tenants/tenant.model");
const { errorResponse } = require("../utils/response.util");

const tenantMiddleware = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return errorResponse(res, "Tenant context missing from token", 401);
    }

    const tenant = await Tenant.findById(req.tenantId).lean();

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