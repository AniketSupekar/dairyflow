const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const { adminOnly } = require("../../middleware/admin.middleware");
const controller = require("./user.controller");

router.use(authMiddleware);
router.use(adminOnly);

// ── Static routes first (before any /:id) ──────────────────
router.post("/", controller.createDeliveryBoy);
router.get("/", controller.getDeliveryBoys);
router.get("/inactive", controller.getInactiveDeliveryBoys);

// ── Dynamic /:id routes ────────────────────────────────────
router.put("/:id", controller.updateDeliveryBoy);
router.put("/:id/assign-lanes", controller.assignLanes);
router.put("/:id/deactivate", controller.deactivateDeliveryBoy);
router.put("/:id/restore", controller.restoreDeliveryBoy);

module.exports = router;