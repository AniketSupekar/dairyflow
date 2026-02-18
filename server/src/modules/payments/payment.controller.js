const Payment = require("./payment.model");
const Bill = require("../billing/bill.model");
const Customer = require("../customers/customer.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const mongoose = require("mongoose");
/**
 * 1️⃣ Create Payment (Professional Allocation)
 */
exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.tenantId;
    const { customerId, amount, paymentMode, date, note } = req.body;

    if (!customerId || !amount || !date) {
      return errorResponse(res, "Missing required fields", 400);
    }

    if (Number(amount) <= 0) {
      return errorResponse(res, "Amount must be greater than 0", 400);
    }

    const paymentDate = new Date(date);

    if (paymentDate > new Date()) {
      return errorResponse(res, "Payment date cannot be in future", 400);
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
      isActive: true,
    }).session(session);

    if (!customer) {
      return errorResponse(res, "Active customer not found", 404);
    }

    let remainingAmount = Number(amount);

    const payment = await Payment.create(
      [{
        tenantId,
        customerId,
        amount,
        paymentMode,
        date: new Date(date),
        note,
      }],
      { session }
    );

    const unpaidBills = await Bill.find({
      tenantId,
      customerId,
      status: { $in: ["UNPAID", "PARTIAL"] },
    })
      .sort({ fromDate: 1 })
      .session(session);

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

      await bill.save({ session });
    }

    if (remainingAmount > 0) {
      customer.advanceBalance =
        (customer.advanceBalance || 0) + remainingAmount;
      await customer.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      "Payment recorded and allocated successfully",
      payment[0]
    );

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

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

exports.deletePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const payment = await Payment.findOne({
      _id: id,
      tenantId,
      isActive: true,
    }).session(session);

    if (!payment) {
      return errorResponse(res, "Payment not found", 404);
    }

    payment.isActive = false;
    await payment.save({ session });

    // Reset bills
    const bills = await Bill.find({
      tenantId,
      customerId: payment.customerId,
    }).session(session);

    for (const bill of bills) {
      bill.amountPaid = 0;
      bill.status = "UNPAID";
      await bill.save({ session });
    }

    // Recalculate all active payments again FIFO
    const activePayments = await Payment.find({
      tenantId,
      customerId: payment.customerId,
      isActive: true,
    })
      .sort({ date: 1 })
      .session(session);

    for (const p of activePayments) {
      let remaining = p.amount;

      for (const bill of bills.sort((a, b) => a.fromDate - b.fromDate)) {
        if (remaining <= 0) break;

        const pending = bill.totalAmount - bill.amountPaid;

        if (remaining >= pending) {
          bill.amountPaid += pending;
          bill.status = "PAID";
          remaining -= pending;
        } else {
          bill.amountPaid += remaining;
          bill.status = "PARTIAL";
          remaining = 0;
        }

        await bill.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, "Payment reversed successfully");

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return errorResponse(res, "Server error", 500);
  }
};