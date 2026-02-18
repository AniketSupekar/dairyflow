const express = require("express");
const router = express.Router();
const controller = require("./billing.controller");
const authMiddleware = require("../../middleware/auth.middleware");

// router.get("/monthly", authMiddleware, controller.generateBill);

router.post("/generate", authMiddleware, controller.generateBill);
router.get("/summary/:customerId", authMiddleware, controller.getBillSummary);
router.get("/ledger/:customerId", authMiddleware, controller.getCustomerLedger);
router.get("/lane-summary", authMiddleware, controller.getLaneSummary);
router.get("/:id/pdf", authMiddleware, controller.downloadBillPdf);

module.exports = router;