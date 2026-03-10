/**
 * modules/tenants/tenant.routes.js
 *
 * All routes are protected — authMiddleware + tenantMiddleware run
 * before these via app.js registration.
 */

const router = require("express").Router();
const ctrl   = require("./tenant.controller");
const { uploadLimiter } = require("../../middleware/rateLimit.middleware");

router.get    ("/settings", ctrl.getSettings);
router.patch  ("/settings", ctrl.updateSettings);
router.post   ("/logo",     uploadLimiter, ctrl.uploadLogo);
router.delete ("/logo",     ctrl.deleteLogo);

module.exports = router;