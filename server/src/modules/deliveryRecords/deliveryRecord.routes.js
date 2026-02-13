const express = require("express");
const router = express.Router();
const controller = require("./deliveryRecord.controller");
const { validateDeliveryInput } = require("../../middleware/validate.middleware");

router.post("/daily", validateDeliveryInput, controller.createDailyDeliveries);
router.get("/date", controller.getDeliveryByDate);

module.exports = router;