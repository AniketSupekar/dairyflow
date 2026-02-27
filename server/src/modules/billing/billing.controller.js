const Bill = require("./bill.model");
const Customer = require("../customers/customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Payment = require("../payments/payment.model");

const { successResponse, errorResponse } = require("../../utils/response.util");

const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

// ─── Helper: derive YYYY-MM string from a Date ────────────────────────────────
const toMonthString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ─── Helper: compute advance balance without trusting stored amountPaid ───────
// Advance = totalPaid - totalBilled (across ALL bills). Safe and deterministic.
const computeAdvance = (allBills, allPayments) => {
  const totalBilled = allBills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const diff = totalPaid - totalBilled;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
};

/**
 * 1️⃣  Generate Bill
 *   - Validates date range (from < to, not future)
 *   - Checks overlapping bills
 *   - Derives month field from fromDate
 *   - Auto-consumes advance balance (deterministic, not from stored amountPaid)
 *   - Prevents generating a ₹0 bill
 */
exports.generateBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.tenantId;
    const { customerId, fromDate, toDate } = req.body;

    if (!customerId || !fromDate || !toDate) {
      return errorResponse(res, "customerId, fromDate, toDate required", 400);
    }

    const start = new Date(fromDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setUTCHours(23, 59, 59, 999);

    // ── Edge case: from must be before to ────────────────────────────────────
    if (start >= end) {
      return errorResponse(res, "fromDate must be before toDate", 400);
    }

    // ── Edge case: no future bills ────────────────────────────────────────────
    if (end > new Date()) {
      return errorResponse(res, "Cannot generate bill for future dates", 400);
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId }).session(session);
    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    // ── Edge case: overlapping bill ───────────────────────────────────────────
    const overlappingBill = await Bill.findOne({
      tenantId,
      customerId,
      fromDate: { $lte: end },
      toDate: { $gte: start },
    }).session(session);

    if (overlappingBill) {
      return errorResponse(
        res,
        `Overlapping bill already exists (${overlappingBill.fromDate.toDateString()} – ${overlappingBill.toDate.toDateString()})`,
        400
      );
    }

    // ── Fetch deliveries for this period ──────────────────────────────────────
    const deliveries = await DeliveryRecord.find({
      tenantId,
      customerId,
      date: { $gte: start, $lte: end },
      status: "DELIVERED",
      isActive: true,
    })
      .populate("productId")
      .session(session);

    const deliveryItems = deliveries.map((d) => {
      const amount = Math.round(d.quantity * d.rate * 100) / 100;
      return {
        date: d.date,
        productName: d.productId?.name || "Product",
        quantity: d.quantity,
        rate: d.rate,
        amount,
      };
    });

    const deliveryTotal = Math.round(
      deliveryItems.reduce((sum, item) => sum + item.amount, 0) * 100
    ) / 100;

    // ── Edge case: no deliveries in range ─────────────────────────────────────
    if (deliveryTotal === 0) {
      return errorResponse(res, "No delivered items found for this period", 400);
    }

    // ── Compute advance deterministically ────────────────────────────────────
    const [allBills, allPayments] = await Promise.all([
      Bill.find({ tenantId, customerId }).session(session),
      Payment.find({ tenantId, customerId, isActive: true }).session(session),
    ]);

    const advanceAvailable = computeAdvance(allBills, allPayments);
    const usableAdvance = Math.min(advanceAvailable, deliveryTotal);
    const amountPaid = Math.round(usableAdvance * 100) / 100;

    let status = "UNPAID";
    if (amountPaid >= deliveryTotal) status = "PAID";
    else if (amountPaid > 0) status = "PARTIAL";

    const bill = await Bill.create(
      [
        {
          tenantId,
          customerId,
          laneId: customer.laneId,
          fromDate: start,
          toDate: end,
          month: toMonthString(start), // ✅ always set month
          deliveryItems,
          deliveryTotal,
          totalAmount: deliveryTotal,
          amountPaid,
          status,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, "Bill generated successfully", bill[0]);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    if (err.code === 11000) {
      return errorResponse(res, "Bill already exists for this period", 400);
    }
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 2️⃣  Download Bill PDF
 */
exports.downloadBillPdf = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const bill = await Bill.findOne({ _id: id, tenantId }).populate("customerId");
    if (!bill) {
      return errorResponse(res, "Bill not found", 404);
    }

    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=bill-${bill._id}.pdf`,
      });
      res.send(pdfData);
    });

    const fmt = (d) => new Date(d).toLocaleDateString("en-IN");

    doc.fontSize(20).font("Helvetica-Bold").text("DAIRY BILL", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Customer: ${bill.customerId.name}`);
    doc.text(`Period: ${fmt(bill.fromDate)} – ${fmt(bill.toDate)}`);
    doc.text(`Generated: ${fmt(bill.generatedAt || bill.createdAt)}`);
    doc.moveDown();

    // Table header
    doc.font("Helvetica-Bold").text("Date           Product              Qty    Rate    Amount");
    doc.font("Helvetica");
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    bill.deliveryItems.forEach((item) => {
      const line = `${fmt(item.date).padEnd(14)} ${item.productName.padEnd(20)} ${String(item.quantity).padEnd(6)} ${String(item.rate).padEnd(7)} ₹${item.amount}`;
      doc.text(line);
    });

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);
    doc.text(`Delivery Total: ₹${bill.deliveryTotal}`);
    doc.text(`Amount Paid:    ₹${bill.amountPaid}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text(`Pending: ₹${bill.totalAmount - bill.amountPaid}`);

    doc.end();
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 3️⃣  Bill Summary (date range)
 */
exports.getBillSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return errorResponse(res, "fromDate and toDate required", 400);
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const [deliveryAgg, paymentAgg] = await Promise.all([
      DeliveryRecord.aggregate([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            customerId: new mongoose.Types.ObjectId(customerId),
            date: { $gte: start, $lte: end },
            status: "DELIVERED",
            isActive: true,
          },
        },
        { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$rate"] } } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            customerId: new mongoose.Types.ObjectId(customerId),
            date: { $gte: start, $lte: end },
            isActive: true,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const deliveryTotal = deliveryAgg[0]?.total || 0;
    const paymentTotal = paymentAgg[0]?.total || 0;
    const finalBalance = customer.openingBalance + deliveryTotal - paymentTotal;

    return successResponse(res, "Bill summary fetched", {
      openingBalance: customer.openingBalance,
      deliveryTotal,
      paymentTotal,
      finalBalance,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 4️⃣  Customer Ledger
 */
exports.getCustomerLedger = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const customer = await Customer.findOne({ _id: customerId, tenantId });
    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const [deliveries, payments] = await Promise.all([
      DeliveryRecord.find({ tenantId, customerId, isActive: true }).lean(),
      Payment.find({ tenantId, customerId, isActive: true }).lean(),
    ]);

    const ledger = [
      ...deliveries.map((d) => ({
        type: "DELIVERY",
        date: d.date,
        amount: d.quantity * d.rate,
        refId: d._id,
      })),
      ...payments.map((p) => ({
        type: "PAYMENT",
        date: p.date,
        amount: -p.amount,
        refId: p._id,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = customer.openingBalance;
    const finalLedger = ledger.map((entry) => {
      runningBalance += entry.amount;
      return { ...entry, runningBalance: Math.round(runningBalance * 100) / 100 };
    });

    return successResponse(res, "Ledger fetched", {
      openingBalance: customer.openingBalance,
      ledger: finalLedger,
      finalBalance: Math.round(runningBalance * 100) / 100,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 5️⃣  Lane Summary
 */
exports.getLaneSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId, month, year } = req.query;

    if (!laneId || !month || !year) {
      return errorResponse(res, "laneId, month and year required", 400);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const customers = await Customer.find({ tenantId, laneId }).lean();
    const customerIds = customers.map((c) => c._id);

    const tenantObjId = new mongoose.Types.ObjectId(tenantId);

    const [deliveryAgg, paymentAgg] = await Promise.all([
      DeliveryRecord.aggregate([
        {
          $match: {
            tenantId: tenantObjId,
            customerId: { $in: customerIds },
            date: { $gte: startDate, $lte: endDate },
            status: "DELIVERED",
            isActive: true,
          },
        },
        { $group: { _id: "$customerId", total: { $sum: { $multiply: ["$quantity", "$rate"] } } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            tenantId: tenantObjId,
            customerId: { $in: customerIds },
            date: { $gte: startDate, $lte: endDate },
            isActive: true,
          },
        },
        { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
      ]),
    ]);

    const deliveryMap = Object.fromEntries(deliveryAgg.map((d) => [d._id.toString(), d.total]));
    const paymentMap = Object.fromEntries(paymentAgg.map((p) => [p._id.toString(), p.total]));

    const summary = customers.map((customer) => {
      const deliveryTotal = deliveryMap[customer._id.toString()] || 0;
      const paymentTotal = paymentMap[customer._id.toString()] || 0;
      const finalBalance = customer.openingBalance + deliveryTotal - paymentTotal;
      return {
        customerId: customer._id,
        customerName: customer.name,
        openingBalance: customer.openingBalance,
        deliveryTotal,
        paymentTotal,
        finalBalance: Math.round(finalBalance * 100) / 100,
      };
    });

    return successResponse(res, "Lane summary fetched", summary);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 6️⃣  Customer Financial Summary (for panel header cards)
 */
exports.getCustomerFinancialSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const [bills, payments] = await Promise.all([
      Bill.find({ tenantId, customerId }),
      Payment.find({ tenantId, customerId, isActive: true }),
    ]);

    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const diff = totalPaid - totalBilled;

    return successResponse(res, "Financial summary fetched", {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      advanceBalance: diff > 0 ? Math.round(diff * 100) / 100 : 0,
      totalOutstanding: diff < 0 ? Math.round(Math.abs(diff) * 100) / 100 : 0,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 7️⃣  Bills by Customer (paginated + month filter)
 */
exports.getBillsByCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    let { page = 1, limit = 10, month } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { tenantId, customerId };

    if (month) {
      const [year, monthNumber] = month.split("-");
      filter.fromDate = { $gte: new Date(year, monthNumber - 1, 1) };
      filter.toDate = { $lte: new Date(year, monthNumber, 0, 23, 59, 59) };
    }

    const [total, bills] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter)
        .sort({ fromDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    return successResponse(res, "Bills fetched successfully", {
      data: bills,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

/**
 * 8️⃣  Customer Outstanding
 */
exports.getCustomerOutstanding = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const [bills, payments] = await Promise.all([
      Bill.find({ tenantId, customerId }),
      Payment.find({ tenantId, customerId, isActive: true }),
    ]);

    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = totalBilled - totalPaid;

    return successResponse(res, "Outstanding fetched", {
      outstanding: outstanding > 0 ? Math.round(outstanding * 100) / 100 : 0,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};