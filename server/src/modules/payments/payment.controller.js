const Payment = require("./payment.model");
const Bill = require("../billing/bill.model");
const Customer = require("../customers/customer.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const mongoose = require("mongoose");

// ─── Helper: recalculate all bill statuses for a customer from scratch ────────
const recalculateBillAllocations = async (tenantId, customerId, session) => {
  const bills = await Bill.find({ tenantId, customerId })
    .sort({ fromDate: 1 })
    .session(session);

  for (const bill of bills) {
    bill.amountPaid = 0;
    bill.status = "UNPAID";
    await bill.save({ session });
  }

  const activePayments = await Payment.find({
    tenantId,
    customerId,
    isActive: true,
  })
    .sort({ date: 1 })
    .session(session)
    .lean(); // ✅ payments are read-only in this loop

  for (const p of activePayments) {
    let remaining = p.amount;

    for (const bill of bills) {
      if (remaining <= 0) break;

      const pending = Math.round((bill.totalAmount - bill.amountPaid) * 100) / 100;
      if (pending <= 0) continue;

      if (remaining >= pending) {
        bill.amountPaid = Math.round((bill.amountPaid + pending) * 100) / 100;
        bill.status = "PAID";
        remaining = Math.round((remaining - pending) * 100) / 100;
      } else {
        bill.amountPaid = Math.round((bill.amountPaid + remaining) * 100) / 100;
        bill.status = "PARTIAL";
        remaining = 0;
      }

      await bill.save({ session });
    }
  }
};

exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.tenantId;
    const { customerId, amount, paymentMode, date, note } = req.body;

    if (!customerId || !amount || !date) {
      return errorResponse(res, "Missing required fields: customerId, amount, date", 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return errorResponse(res, "Amount must be a positive number", 400);
    }
    if (numAmount > 1_000_000) {
      return errorResponse(res, "Amount exceeds maximum allowed (₹10,00,000)", 400);
    }

    const paymentDate = new Date(date);
    if (isNaN(paymentDate.getTime())) {
      return errorResponse(res, "Invalid payment date", 400);
    }
    if (paymentDate > new Date()) {
      return errorResponse(res, "Payment date cannot be in the future", 400);
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
      isActive: true,
    })
      .session(session)
      .lean();

    if (!customer) {
      return errorResponse(res, "Active customer not found", 404);
    }

    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const duplicate = await Payment.findOne({
      tenantId,
      customerId,
      amount: numAmount,
      date: paymentDate,
      isActive: true,
      createdAt: { $gte: tenSecondsAgo },
    })
      .session(session)
      .lean();

    if (duplicate) {
      return errorResponse(
        res,
        "Duplicate payment detected. Same amount and date submitted within 10 seconds.",
        409
      );
    }

    const [payment] = await Payment.create(
      [
        {
          tenantId,
          customerId,
          amount: numAmount,
          paymentMode: paymentMode || "CASH",
          date: paymentDate,
          note: note?.trim() || undefined,
        },
      ],
      { session }
    );

    await recalculateBillAllocations(tenantId, customerId, session);

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, "Payment recorded and allocated successfully", payment);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getPaymentsByCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    let { page = 1, limit = 10, month } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { tenantId, customerId, isActive: true };

    if (month) {
      const [year, monthNumber] = month.split("-");
      filter.date = {
        $gte: new Date(year, monthNumber - 1, 1),
        $lte: new Date(year, monthNumber, 0, 23, 59, 59),
      };
    }

    const [total, payments] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(), // ✅ read-only list
    ]);

    return successResponse(res, "Payments fetched", {
      data: payments,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
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

    await recalculateBillAllocations(tenantId, payment.customerId.toString(), session);

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