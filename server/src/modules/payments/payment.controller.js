const Payment = require("./payment.model");
const Bill = require("../billing/bill.model");
const Customer = require("../customers/customer.model");
const { successResponse, errorResponse } = require("../../utils/response.util");

/**
 * 1️⃣ Create Payment (Professional Allocation)
 */
exports.createPayment = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId, amount, paymentMode, date, note } = req.body;

    if (!customerId || !amount || !date) {
      return errorResponse(res, "Missing required fields", 400);
    }

    let remainingAmount = Number(amount);

    // Save payment history
    const payment = await Payment.create({
      tenantId,
      customerId,
      amount,
      paymentMode,
      date: new Date(date),
      note,
    });

    // Fetch unpaid bills oldest first
    const unpaidBills = await Bill.find({
      tenantId,
      customerId,
      status: { $in: ["UNPAID", "PARTIAL"] },
    }).sort({ fromDate: 1 });

    for (const bill of unpaidBills) {
      if (remainingAmount <= 0) break;

      const pending = bill.totalAmount - bill.amountPaid;

      if (remainingAmount >= pending) {
        bill.amountPaid += pending;
        bill.status = "PAID";
        remainingAmount -= pending;
      } else {
        bill.amountPaid += remainingAmount;
        bill.status = "PARTIAL";
        remainingAmount = 0;
      }

      await bill.save();
    }

    // Extra → store as advance
    if (remainingAmount > 0) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { advanceBalance: remainingAmount },
      });
    }

    return successResponse(
      res,
      "Payment recorded and allocated successfully",
      payment
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 2️⃣ Get Payments by Customer
 */
exports.getPaymentsByCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const payments = await Payment.find({
      tenantId,
      customerId,
    }).sort({ date: -1 });

    return successResponse(res, "Payments fetched", payments);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};