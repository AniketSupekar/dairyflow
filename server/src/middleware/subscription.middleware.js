/**
 * middleware/subscription.middleware.js
 *
 * Runs AFTER tenantMiddleware — req.tenant already loaded.
 *
 * Active:  free plan within trialEndsAt, OR pro/enterprise → passes through
 * Expired: free plan past trialEndsAt → blocks all POST/PUT/PATCH/DELETE
 *          GET requests always allowed → read-only mode
 *
 * Frontend reads code: "SUBSCRIPTION_EXPIRED" and shows upgrade modal.
 */

const { isSubscriptionActive } = require("../config/plans.config");

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

module.exports = (req, res, next) => {
  // Always allow reads
  if (!MUTATION_METHODS.has(req.method)) return next();

  // Active subscription — let through
  if (isSubscriptionActive(req.tenant)) return next();

  // Expired — block mutations
  return res.status(403).json({
    success: false,
    code:    "SUBSCRIPTION_EXPIRED",
    message: "Your free trial has ended. Please upgrade to continue using DairyFlow.",
  });
};