const express = require("express");
const router = express.Router();
const controller = require("./billing.controller");

// ── Static routes FIRST (before /:id) ────────────────────────────────────────
router.get ("/dashboard-stats",             controller.getDashboardStats);
router.get ("/outstanding",                 controller.getOutstandingList);
router.get("/analytics", controller.getAnalytics);

// Bulk billing — preview, generate, download ZIP
router.post("/bulk-preview",               controller.bulkPreview);
router.post("/bulk-generate",              controller.bulkGenerate);
router.post("/bulk-download",              controller.bulkDownloadZip);

router.post("/generate",                   controller.generateBill);
router.get ("/summary/:customerId",        controller.getBillSummary);
router.get ("/ledger/:customerId",         controller.getCustomerLedger);
router.get ("/lane-summary",               controller.getLaneSummary);
router.get ("/customer/:customerId",       controller.getBillsByCustomer);
router.get ("/customer-summary/:customerId", controller.getCustomerFinancialSummary);

// ── Dynamic /:id routes LAST ──────────────────────────────────────────────────
router.get ("/:id/pdf",                    controller.downloadBillPdf);

module.exports = router;