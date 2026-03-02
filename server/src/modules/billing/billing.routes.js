const express = require("express");
const router = express.Router();
const controller = require("./billing.controller");

// ── Static routes first (before /:id) ────────────────────────────────────────
router.get("/dashboard-stats", controller.getDashboardStats);
router.post("/generate", controller.generateBill);
router.get("/summary/:customerId", controller.getBillSummary);
router.get("/ledger/:customerId", controller.getCustomerLedger);
router.get("/lane-summary", controller.getLaneSummary);
router.get("/customer/:customerId", controller.getBillsByCustomer);
router.get("/customer-summary/:customerId", controller.getCustomerFinancialSummary);

// ── Dynamic /:id routes ───────────────────────────────────────────────────────
router.get("/:id/pdf", controller.downloadBillPdf);

module.exports = router;