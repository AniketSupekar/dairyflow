const express = require("express");
const router = express.Router();
const controller = require("./deliveryRecord.controller");
const auth = require("../../middleware/auth.middleware");

router.post("/", auth, controller.upsertDeliveryRecord);
router.get("/", auth, controller.getDeliveriesByDate);
router.put("/:id", auth, controller.updateDeliveryRecord);
router.delete("/:id", auth, controller.deleteDeliveryRecord);

module.exports = router;