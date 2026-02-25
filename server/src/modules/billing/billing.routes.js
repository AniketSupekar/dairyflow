const express = require("express");
const router = express.Router();
const controller = require("./billing.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.use(authMiddleware);

router.post("/generate", controller.generateBill);

router.get("/summary/:customerId", controller.getBillSummary);

router.get("/ledger/:customerId", controller.getCustomerLedger);

router.get("/lane-summary", controller.getLaneSummary);

/**
 * NEW ROUTE — required by frontend financial panel
 */
router.get("/customer/:customerId", controller.getBillsByCustomer);

router.get(
  "/customer-summary/:customerId",
  controller.getCustomerFinancialSummary
);

router.get("/:id/pdf", controller.downloadBillPdf);

module.exports = router;