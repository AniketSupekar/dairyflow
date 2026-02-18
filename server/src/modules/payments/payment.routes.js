const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.use(authMiddleware);

router.post("/", paymentController.createPayment);
router.get("/:customerId", paymentController.getPaymentsByCustomer);
router.delete("/:id", paymentController.deletePayment);

module.exports = router;