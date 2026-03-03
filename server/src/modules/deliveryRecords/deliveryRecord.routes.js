const express = require("express");
const router = express.Router();
const controller = require("./deliveryRecord.controller");

// ── Static routes FIRST ───────────────────────────────────────────────────────
router.get ("/my-stats",      controller.getMyDeliveryStats);
router.get ("/daily-summary", controller.getDailySummary);    // NEW — admin only
router.get ("/",              controller.getDeliveriesByDate);

// ── Dynamic /:id routes LAST ──────────────────────────────────────────────────
router.post  ("/",    controller.upsertDeliveryRecord);
router.put   ("/:id", controller.updateDeliveryRecord);
router.delete("/:id", controller.deleteDeliveryRecord);

module.exports = router;