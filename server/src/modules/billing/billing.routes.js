const express = require("express");
const router = express.Router();
const controller = require("./billing.controller");

router.get("/monthly", controller.generateBill);

module.exports = router;