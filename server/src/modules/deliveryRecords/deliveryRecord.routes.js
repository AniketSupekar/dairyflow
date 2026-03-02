const express = require("express");
const router = express.Router();
const controller = require("./deliveryRecord.controller");
const auth = require("../../middleware/auth.middleware");

// ── Static routes first (before /:id) ────────────────────────────────────────
// Returns today's delivered count for the logged-in user's assigned lanes
router.get("/my-stats", auth, controller.getMyDeliveryStats);

// ── Existing routes ───────────────────────────────────────────────────────────
router.post("/", auth, controller.upsertDeliveryRecord);
router.get("/", auth, controller.getDeliveriesByDate);
router.put("/:id", auth, controller.updateDeliveryRecord);
router.delete("/:id", auth, controller.deleteDeliveryRecord);

module.exports = router;