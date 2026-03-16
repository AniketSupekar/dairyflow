/**
 * config/plans.config.js
 *
 * Single source of truth for plan limits and features.
 * Plan enum matches tenant.model.js exactly: "free" | "pro" | "enterprise"
 */

const PLANS = {
  free: {
    label:         "Free Trial",
    lanes:         999,
    customers:     999,
    deliveryBoys:  999,
    analytics:     true,
    whatsappBlast: true,
    upiLinks:      true,
  },
  pro: {
    label:         "Pro",
    price:         699,
    lanes:         999,
    customers:     999,
    deliveryBoys:  999,
    analytics:     true,
    whatsappBlast: true,
    upiLinks:      true,
  },
  enterprise: {
    label:         "Enterprise",
    price:         1299,
    lanes:         999,
    customers:     999,
    deliveryBoys:  999,
    analytics:     true,
    whatsappBlast: true,
    upiLinks:      true,
  },
};

/**
 * Active = free plan within trial period, OR paid plan (pro/enterprise).
 * Mirrors the isTrialActive virtual in tenant.model.js.
 */
const isSubscriptionActive = (tenant) => {
  if (!tenant) return false;
  if (tenant.plan === "free") {
    return new Date() < new Date(tenant.trialEndsAt);
  }
  // pro / enterprise — active (manual management for now)
  return tenant.plan in PLANS;
};

/**
 * Days left in free trial. Returns null for paid plans.
 * Negative value means expired.
 */
const trialDaysLeft = (tenant) => {
  if (!tenant || tenant.plan !== "free") return null;
  const ms = new Date(tenant.trialEndsAt) - new Date();
  return Math.ceil(ms / 86_400_000);
};

module.exports = { PLANS, isSubscriptionActive, trialDaysLeft };