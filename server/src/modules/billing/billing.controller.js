const Bill = require("./bill.model");
const Customer = require("../customers/customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Payment = require("../payments/payment.model");

const { successResponse, errorResponse } = require("../../utils/response.util");

const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");


exports.generateBill = async (req, res) => {
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

    const customer = await Customer.findOne({
      _id: customerId,
      tenantId,
    });

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    // ✅ Prevent overlapping bills
    const overlappingBill = await Bill.findOne({
      tenantId,
      customerId,
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });

    if (overlappingBill) {
      return errorResponse(res, "Overlapping bill period exists", 400);
    }

    // ✅ Opening balance ONLY from previous bills
    const previousBills = await Bill.find({
      tenantId,
      customerId,
      toDate: { $lt: start },
      status: { $in: ["UNPAID", "PARTIAL"] },
    });

    const openingBalance = previousBills.reduce((sum, bill) => {
      return sum + (bill.totalAmount - bill.amountPaid);
    }, 0);

    // ✅ Fetch only active delivered deliveries
    const deliveries = await DeliveryRecord.find({
      tenantId,
      customerId,
      date: { $gte: start, $lte: end },
      status: "DELIVERED",
      isActive: true,
    }).populate("productId");

    const deliveryItems = deliveries.map((d) => ({
      date: d.date,
      productName: d.productId?.name || "Product",
      quantity: d.quantity,
      rate: d.rate,
      amount: d.quantity * d.rate,
    }));

    const deliveryTotal = deliveryItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    if (openingBalance === 0 && deliveryTotal === 0) {
      return errorResponse(res, "No deliveries found for this period", 400);
    }


    const totalAmount = openingBalance + deliveryTotal;

    const bill = await Bill.create({
      tenantId,
      customerId,
      laneId: customer.laneId,
      fromDate: start,
      toDate: end,
      openingBalance,
      deliveryItems,
      deliveryTotal,
      totalAmount,
      amountPaid: 0,
      status: "UNPAID",
    });

    return successResponse(res, "Bill generated successfully", bill);
  } catch (err) {
    console.error(err);

    // ✅ Handle duplicate index error safely
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
    doc.text(`Opening Balance: ₹${bill.openingBalance}`);
    doc.text(`Delivery Total: ₹${bill.deliveryTotal}`);
    doc.text(`Total Amount: ₹${bill.totalAmount}`);
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