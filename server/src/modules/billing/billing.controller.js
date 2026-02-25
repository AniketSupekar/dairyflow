const Bill = require("./bill.model");
const Customer = require("../customers/customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Payment = require("../payments/payment.model");

const { successResponse, errorResponse } = require("../../utils/response.util");

const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");


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

    if (end > new Date()) {
      return errorResponse(res, "Cannot generate bill for future dates", 400);
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
    }).session(session);

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const overlappingBill = await Bill.findOne({
      tenantId,
      customerId,
      fromDate: { $lte: end },
      toDate: { $gte: start },
    }).session(session);

    if (overlappingBill) {
      return errorResponse(res, "Overlapping bill period exists", 400);
    }

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

    let deliveryTotal = deliveryItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    deliveryTotal = Math.round(deliveryTotal * 100) / 100;

    if (deliveryTotal === 0) {
      return errorResponse(res, "No deliveries found for this period", 400);
    }

    let totalAmount = deliveryTotal;
    let amountPaid = 0;
    let status = "UNPAID";

    // 🔥 AUTO CONSUME ADVANCE (Dynamic Calculation)
const allBills = await Bill.find({
  tenantId,
  customerId,
}).session(session);

const allPayments = await Payment.find({
  tenantId,
  customerId,
  isActive: true,
}).session(session);

const totalBilledSoFar = allBills.reduce(
  (sum, b) => sum + b.totalAmount,
  0
);

const totalPaidSoFar = allPayments.reduce(
  (sum, p) => sum + p.amount,
  0
);

const advanceAvailable =
  totalPaidSoFar - totalBilledSoFar > 0
    ? totalPaidSoFar - totalBilledSoFar
    : 0;

if (advanceAvailable > 0) {
  const usableAdvance = Math.min(advanceAvailable, deliveryTotal);

  amountPaid = usableAdvance;

  if (usableAdvance === deliveryTotal) {
    status = "PAID";
  } else {
    status = "PARTIAL";
  }
}

    const bill = await Bill.create(
      [
        {
          tenantId,
          customerId,
          laneId: customer.laneId,
          fromDate: start,
          toDate: end,
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
 * 2️⃣ Download Bill PDF (Updated)
 */
exports.downloadBillPdf = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const bill = await Bill.findOne({
      _id: id,
      tenantId,
    }).populate("customerId");

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

    doc.fontSize(18).text("DAIRY BILL", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Customer: ${bill.customerId.name}`);
    doc.text(`From: ${bill.fromDate.toDateString()}`);
    doc.text(`To: ${bill.toDate.toDateString()}`);
    doc.moveDown();

    doc.text("Date | Product | Qty | Rate | Amount");
    doc.moveDown(0.5);

    bill.deliveryItems.forEach((item) => {
      doc.text(
        `${new Date(item.date).toDateString()} | ${item.productName} | ${item.quantity} | ${item.rate} | ${item.amount}`
      );
    });

    doc.moveDown();
    doc.text(`Delivery Total: ₹${bill.deliveryTotal}`);
    doc.text(`Amount Paid: ₹${bill.amountPaid}`);
    doc.moveDown();
    doc.fontSize(14).text(
      `Pending: ₹${bill.totalAmount - bill.amountPaid}`
    );

    doc.end();
  } catch (err) {
    console.error(err);
    return errorResponse(res, "Server error", 500);
  }
};


exports.getBillSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return errorResponse(res, "fromDate and toDate required", 400);
    }

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
    });

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const deliveryAgg = await DeliveryRecord.aggregate([
      {
        $match: {
          tenantId: customer.tenantId,
          customerId: customer._id,
          date: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ["$quantity", "$rate"] },
          },
        },
      },
    ]);

    const paymentAgg = await Payment.aggregate([
      {
        $match: {
          tenantId: customer.tenantId,
          customerId: customer._id,
          date: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const deliveryTotal = deliveryAgg[0]?.total || 0;
    const paymentTotal = paymentAgg[0]?.total || 0;

    const finalBalance =
      customer.openingBalance + deliveryTotal - paymentTotal;

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
 * 3️⃣ Full Running Ledger
 */
exports.getCustomerLedger = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
    });

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const deliveries = await DeliveryRecord.find({
      tenantId,
      customerId,
    }).lean();

    const payments = await Payment.find({
      tenantId,
      customerId,
    }).lean();

    const deliveryEntries = deliveries.map((d) => ({
      type: "DELIVERY",
      date: d.date,
      amount: d.quantity * d.rate,
      refId: d._id,
    }));

    const paymentEntries = payments.map((p) => ({
      type: "PAYMENT",
      date: p.date,
      amount: -p.amount,
      refId: p._id,
    }));

    const ledger = [...deliveryEntries, ...paymentEntries];

    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = customer.openingBalance;

    const finalLedger = ledger.map((entry) => {
      runningBalance += entry.amount;
      return {
        ...entry,
        runningBalance,
      };
    });

    return successResponse(res, "Ledger fetched", {
      openingBalance: customer.openingBalance,
      ledger: finalLedger,
      finalBalance: runningBalance,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getLaneSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId, month, year } = req.query;

    if (!laneId || !month || !year) {
      return errorResponse(res, "laneId, month and year required", 400);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1️⃣ Get customers in that lane
    const customers = await Customer.find({
      tenantId,
      laneId,
    }).lean();

    const customerIds = customers.map((c) => c._id);

    // 2️⃣ Aggregate deliveries
    const deliveryAgg = await DeliveryRecord.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          customerId: { $in: customerIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$customerId",
          total: {
            $sum: { $multiply: ["$quantity", "$rate"] },
          },
        },
      },
    ]);

    // 3️⃣ Aggregate payments
    const paymentAgg = await Payment.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          customerId: { $in: customerIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$customerId",
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Convert to map for fast lookup
    const deliveryMap = {};
    deliveryAgg.forEach((d) => {
      deliveryMap[d._id.toString()] = d.total;
    });

    const paymentMap = {};
    paymentAgg.forEach((p) => {
      paymentMap[p._id.toString()] = p.total;
    });

    // 4️⃣ Build final summary
    const summary = customers.map((customer) => {
      const deliveryTotal = deliveryMap[customer._id.toString()] || 0;
      const paymentTotal = paymentMap[customer._id.toString()] || 0;

      const finalBalance =
        customer.openingBalance + deliveryTotal - paymentTotal;

      return {
        customerId: customer._id,
        customerName: customer.name,
        openingBalance: customer.openingBalance,
        deliveryTotal,
        paymentTotal,
        finalBalance,
      };
    });

    return successResponse(res, "Lane summary fetched", summary);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getCustomerFinancialSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const bills = await Bill.find({ tenantId, customerId });
    const payments = await Payment.find({
      tenantId,
      customerId,
      isActive: true,
    });

    const totalBilled = bills.reduce(
      (sum, b) => sum + b.totalAmount,
      0
    );

    const totalPaid = payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const difference = totalPaid - totalBilled;

    const advanceBalance =
      difference > 0 ? Math.round(difference * 100) / 100 : 0;

    const totalOutstanding =
      difference < 0 ? Math.round(Math.abs(difference) * 100) / 100 : 0;

    return successResponse(res, "Financial summary fetched", {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      advanceBalance,
      totalOutstanding,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getBillsByCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const bills = await Bill.find({
      tenantId,
      customerId,
    }).sort({ fromDate: -1 });

    return successResponse(res, "Bills fetched successfully", bills);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getCustomerOutstanding = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;

    const bills = await Bill.find({ tenantId, customerId });
    const customer = await Customer.findOne({ _id: customerId, tenantId });

    const totalOutstanding = bills.reduce((sum, bill) => {
      return sum + (bill.totalAmount - bill.amountPaid);
    }, 0);

    const finalOutstanding =
      Math.round(
        (totalOutstanding - (customer.advanceBalance || 0)) * 100
      ) / 100;

    return successResponse(res, "Outstanding fetched", {
      outstanding: finalOutstanding < 0 ? 0 : finalOutstanding,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};