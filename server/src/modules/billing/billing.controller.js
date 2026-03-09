/**
 * billing.controller.js
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 * 1. Removed inline buildBillPdfBuffer() — now imported from pdf.util.js
 * 2. downloadBillPdf — now populates laneId + calls buildBillFilename()
 *    This is what fixes "bill-69a6ad6b...pdf" → "RajeshKumar_Sector12_Jun2025.pdf"
 * 3. bulkDownloadZip — now calls buildBillFilename() for consistent naming
 * 4. Added const Lane = require("../lanes/lane.model") (used by populate)
 */

const Bill         = require("./bill.model");
const Customer     = require("../customers/customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Payment      = require("../payments/payment.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const { buildBillPdfBuffer, buildBillFilename } = require("../../utils/pdf.util");
const mongoose     = require("mongoose");
const archiver     = require("archiver");

const toMonthString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const computeAdvance = (allBills, allPayments) => {
  const totalBilled = allBills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid   = allPayments.reduce((s, p) => s + p.amount, 0);
  const diff = totalPaid - totalBilled;
  return diff > 0 ? Math.round(diff * 100) / 100 : 0;
};

exports.generateBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.tenantId;
    const { customerId, fromDate, toDate } = req.body;
    if (!customerId || !fromDate || !toDate)
      return errorResponse(res, "customerId, fromDate, toDate required", 400);
    const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999);
    if (start >= end)    return errorResponse(res, "fromDate must be before toDate", 400);
    if (end > new Date()) return errorResponse(res, "Cannot generate bill for future dates", 400);
    const customer = await Customer.findOne({ _id: customerId, tenantId }).session(session);
    if (!customer) return errorResponse(res, "Customer not found", 404);
    const overlappingBill = await Bill.findOne({
      tenantId, customerId, fromDate: { $lte: end }, toDate: { $gte: start },
    }).session(session);
    if (overlappingBill)
      return errorResponse(res, `Overlapping bill already exists (${overlappingBill.fromDate.toDateString()} – ${overlappingBill.toDate.toDateString()})`, 400);
    const deliveries = await DeliveryRecord.find({
      tenantId, customerId, date: { $gte: start, $lte: end }, status: "DELIVERED", isActive: true,
    }).populate("productId").session(session).lean();
    const deliveryItems = deliveries.map((d) => ({
      date:        d.date,
      productName: d.productId?.name || "Product",
      quantity:    d.quantity,
      rate:        d.rate,
      amount:      Math.round(d.quantity * d.rate * 100) / 100,
    }));
    const deliveryTotal = Math.round(deliveryItems.reduce((s, i) => s + i.amount, 0) * 100) / 100;
    if (deliveryTotal === 0)
      return errorResponse(res, "No delivered items found for this period", 400);
    const [allBills, allPayments] = await Promise.all([
      Bill.find({ tenantId, customerId }).session(session).lean(),
      Payment.find({ tenantId, customerId, isActive: true }).session(session).lean(),
    ]);
    const advanceAvailable = computeAdvance(allBills, allPayments);
    const usableAdvance    = Math.min(advanceAvailable, deliveryTotal);
    const amountPaid       = Math.round(usableAdvance * 100) / 100;
    let status = "UNPAID";
    if (amountPaid >= deliveryTotal) status = "PAID";
    else if (amountPaid > 0)         status = "PARTIAL";
    const bill = await Bill.create([{
      tenantId, customerId, laneId: customer.laneId,
      fromDate: start, toDate: end, month: toMonthString(start),
      deliveryItems, deliveryTotal, totalAmount: deliveryTotal, amountPaid, status,
    }], { session });
    await session.commitTransaction();
    session.endSession();
    return successResponse(res, "Bill generated successfully", bill[0]);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    if (err.code === 11000) return errorResponse(res, "Bill already exists for this period", 400);
    return errorResponse(res, "Server error", 500);
  }
};

// ─── Single PDF download ──────────────────────────────────────────────────────
// FIX: populate laneId so buildBillFilename() can read lane name.
// FIX: use buildBillFilename() → "RajeshKumar_Sector12_Jun2025.pdf"
//      (old code had hardcoded `filename=bill-${bill._id}.pdf`)
exports.downloadBillPdf = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    const bill = await Bill.findOne({ _id: id, tenantId })
      .populate("customerId", "name phone")
      .populate("laneId",     "name")       // ← was missing before
      .lean();

    if (!bill) return errorResponse(res, "Bill not found", 404);

    const laneName  = bill.laneId?.name || "";
    const filename  = buildBillFilename(bill, laneName);
    const pdfBuffer = await buildBillPdfBuffer(bill, laneName);

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF DOWNLOAD ERROR:", err);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getBillSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) return errorResponse(res, "fromDate and toDate required", 400);
    const customer = await Customer.findOne({ _id: customerId, tenantId }).lean();
    if (!customer) return errorResponse(res, "Customer not found", 404);
    const start = new Date(fromDate);
    const end   = new Date(toDate);
    const [deliveryAgg, paymentAgg] = await Promise.all([
      DeliveryRecord.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), customerId: new mongoose.Types.ObjectId(customerId), date: { $gte: start, $lte: end }, status: "DELIVERED", isActive: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$rate"] } } } },
      ]),
      Payment.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), customerId: new mongoose.Types.ObjectId(customerId), date: { $gte: start, $lte: end }, isActive: true } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    const deliveryTotal = deliveryAgg[0]?.total || 0;
    const paymentTotal  = paymentAgg[0]?.total  || 0;
    const finalBalance  = customer.openingBalance + deliveryTotal - paymentTotal;
    return successResponse(res, "Bill summary fetched", { openingBalance: customer.openingBalance, deliveryTotal, paymentTotal, finalBalance });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, tenantId }).lean();
    if (!customer) return errorResponse(res, "Customer not found", 404);
    const [deliveries, payments] = await Promise.all([
      DeliveryRecord.find({ tenantId, customerId, isActive: true }).lean(),
      Payment.find({ tenantId, customerId, isActive: true }).lean(),
    ]);
    const ledger = [
      ...deliveries.map((d) => ({ type: "DELIVERY", date: d.date, amount: d.quantity * d.rate, refId: d._id })),
      ...payments.map((p)  => ({ type: "PAYMENT",  date: p.date, amount: -p.amount,            refId: p._id })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = customer.openingBalance;
    const finalLedger  = ledger.map((entry) => {
      runningBalance += entry.amount;
      return { ...entry, runningBalance: Math.round(runningBalance * 100) / 100 };
    });
    return successResponse(res, "Ledger fetched", { openingBalance: customer.openingBalance, ledger: finalLedger, finalBalance: Math.round(runningBalance * 100) / 100 });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getLaneSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId, month, year } = req.query;
    if (!laneId || !month || !year) return errorResponse(res, "laneId, month and year required", 400);
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);
    const customers = await Customer.find({ tenantId, laneId }).lean();
    const customerIds = customers.map((c) => c._id);
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const [deliveryAgg, paymentAgg] = await Promise.all([
      DeliveryRecord.aggregate([
        { $match: { tenantId: tenantObjId, customerId: { $in: customerIds }, date: { $gte: startDate, $lte: endDate }, status: "DELIVERED", isActive: true } },
        { $group: { _id: "$customerId", total: { $sum: { $multiply: ["$quantity", "$rate"] } } } },
      ]),
      Payment.aggregate([
        { $match: { tenantId: tenantObjId, customerId: { $in: customerIds }, date: { $gte: startDate, $lte: endDate }, isActive: true } },
        { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
      ]),
    ]);
    const deliveryMap = Object.fromEntries(deliveryAgg.map((d) => [d._id.toString(), d.total]));
    const paymentMap  = Object.fromEntries(paymentAgg.map((p)  => [p._id.toString(), p.total]));
    const summary = customers.map((customer) => {
      const deliveryTotal = deliveryMap[customer._id.toString()] || 0;
      const paymentTotal  = paymentMap[customer._id.toString()]  || 0;
      const finalBalance  = customer.openingBalance + deliveryTotal - paymentTotal;
      return { customerId: customer._id, customerName: customer.name, openingBalance: customer.openingBalance, deliveryTotal, paymentTotal, finalBalance: Math.round(finalBalance * 100) / 100 };
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
    const [bills, payments] = await Promise.all([
      Bill.find({ tenantId, customerId }).lean(),
      Payment.find({ tenantId, customerId, isActive: true }).lean(),
    ]);
    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid   = payments.reduce((s, p) => s + p.amount, 0);
    const diff = totalPaid - totalBilled;
    return successResponse(res, "Financial summary fetched", {
      totalBilled:      Math.round(totalBilled * 100) / 100,
      totalPaid:        Math.round(totalPaid * 100) / 100,
      advanceBalance:   diff > 0 ? Math.round(diff * 100) / 100 : 0,
      totalOutstanding: diff < 0 ? Math.round(Math.abs(diff) * 100) / 100 : 0,
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
    let { page = 1, limit = 10, month } = req.query;
    page = parseInt(page); limit = parseInt(limit);
    const filter = { tenantId, customerId };
    if (month) {
      const [year, monthNumber] = month.split("-");
      filter.fromDate = { $gte: new Date(year, monthNumber - 1, 1) };
      filter.toDate   = { $lte: new Date(year, monthNumber, 0, 23, 59, 59) };
    }
    const [total, bills] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter).sort({ fromDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return successResponse(res, "Bills fetched successfully", { data: bills, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getCustomerOutstanding = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerId } = req.params;
    const [bills, payments] = await Promise.all([
      Bill.find({ tenantId, customerId }).lean(),
      Payment.find({ tenantId, customerId, isActive: true }).lean(),
    ]);
    const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid   = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = totalBilled - totalPaid;
    return successResponse(res, "Outstanding fetched", { outstanding: outstanding > 0 ? Math.round(outstanding * 100) / 100 : 0 });
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const tenantId   = req.tenantId;
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);
    const [totalCustomers, totalLanes, deliveriesToday, pendingBills] = await Promise.all([
      Customer.countDocuments({ tenantId, isActive: true }),
      require("../lanes/lane.model").countDocuments({ tenantId, isActive: true }),
      DeliveryRecord.countDocuments({ tenantId, date: { $gte: todayStart, $lte: todayEnd }, status: "DELIVERED", isActive: true }),
      Bill.countDocuments({ tenantId, status: { $in: ["UNPAID", "PARTIAL"] } }),
    ]);
    return successResponse(res, "Dashboard stats fetched", { totalCustomers, totalLanes, deliveriesToday, pendingBills });
  } catch (error) {
    console.error("DASHBOARD STATS ERROR:", error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.getOutstandingList = async (req, res) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const { laneId, sortBy = "outstanding", order = "desc" } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip  = (page - 1) * limit;
    const sharedStages = [
      { $match: { tenantId, status: { $in: ["UNPAID", "PARTIAL"] } } },
      { $group: { _id: "$customerId", outstanding: { $sum: { $subtract: ["$totalAmount", "$amountPaid"] } }, totalBilled: { $sum: "$totalAmount" }, totalPaid: { $sum: "$amountPaid" }, billCount: { $sum: 1 }, unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "UNPAID"] }, 1, 0] } }, partialCount: { $sum: { $cond: [{ $eq: ["$status", "PARTIAL"] }, 1, 0] } }, oldestUnpaidDate: { $min: "$fromDate" } } },
      { $match: { outstanding: { $gt: 0.005 } } },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "customer" } },
      { $unwind: "$customer" },
      { $match: { "customer.isActive": true, "customer.tenantId": tenantId } },
      ...(laneId ? [{ $match: { "customer.laneId": new mongoose.Types.ObjectId(laneId) } }] : []),
      { $lookup: { from: "lanes", localField: "customer.laneId", foreignField: "_id", as: "lane" } },
      { $unwind: { path: "$lane", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, customerId: "$_id", customerName: "$customer.name", phone: "$customer.phone", laneId: "$customer.laneId", laneName: { $ifNull: ["$lane.name", "Unknown Lane"] }, outstanding: { $round: ["$outstanding", 2] }, totalBilled: { $round: ["$totalBilled", 2] }, totalPaid: { $round: ["$totalPaid", 2] }, billCount: 1, unpaidCount: 1, partialCount: 1, oldestUnpaidDate: 1 } },
      { $sort: { [sortBy === "name" ? "customerName" : "outstanding"]: order === "asc" ? 1 : -1 } },
    ];
    const [facetResult] = await Bill.aggregate([
      ...sharedStages,
      { $facet: { data: [{ $skip: skip }, { $limit: limit }], totals: [{ $group: { _id: null, totalOutstanding: { $sum: "$outstanding" }, totalCustomers: { $sum: 1 } } }] } },
    ]);
    const customers        = facetResult?.data || [];
    const totalsRaw        = facetResult?.totals?.[0] || { totalOutstanding: 0, totalCustomers: 0 };
    const totalCustomers   = totalsRaw.totalCustomers;
    const totalOutstanding = Math.round((totalsRaw.totalOutstanding || 0) * 100) / 100;
    return successResponse(res, "Outstanding list fetched", { customers, summary: { totalOutstanding, totalCustomers }, pagination: { page, limit, total: totalCustomers, pages: Math.ceil(totalCustomers / limit) } });
  } catch (error) {
    console.error("OUTSTANDING LIST ERROR:", error);
    return errorResponse(res, "Server error", 500);
  }
};

// =============================================================================
// BULK BILLING
// =============================================================================

exports.bulkPreview = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId, fromDate, toDate } = req.body;
    if (!fromDate || !toDate) return errorResponse(res, "fromDate and toDate required", 400);
    const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999);
    if (start >= end)    return errorResponse(res, "fromDate must be before toDate", 400);
    if (end > new Date()) return errorResponse(res, "Cannot preview bills for future dates", 400);
    const customerFilter = { tenantId, isActive: true };
    if (laneId && laneId !== "all") customerFilter.laneId = laneId;
    const customers = await Customer.find(customerFilter).populate("laneId", "name").lean();
    if (!customers.length)
      return successResponse(res, "No customers found", { customers: [], summary: { eligible: 0, alreadyBilled: 0, noDeliveries: 0 } });
    const customerIds = customers.map((c) => c._id);
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const [deliveryAgg, existingBills] = await Promise.all([
      DeliveryRecord.aggregate([
        { $match: { tenantId: tenantObjId, customerId: { $in: customerIds }, date: { $gte: start, $lte: end }, status: "DELIVERED", isActive: true } },
        { $group: { _id: "$customerId", deliveryTotal: { $sum: { $multiply: ["$quantity", "$rate"] } }, deliveryCount: { $sum: 1 } } },
      ]),
      Bill.find({ tenantId, customerId: { $in: customerIds }, fromDate: { $lte: end }, toDate: { $gte: start } }).lean(),
    ]);
    const deliveryMap = Object.fromEntries(deliveryAgg.map((d) => [d._id.toString(), d]));
    const billedSet   = new Set(existingBills.map((b) => b.customerId.toString()));
    const result = customers.map((c) => {
      const id = c._id.toString();
      const delivery = deliveryMap[id];
      const laneName = c.laneId?.name || "Unknown Lane";
      if (billedSet.has(id)) return { customerId: c._id, customerName: c.name, phone: c.phone, laneId: c.laneId?._id || c.laneId, laneName, status: "ALREADY_BILLED", reason: "Bill already exists for this period", estimatedAmount: 0, deliveryCount: 0 };
      if (!delivery || delivery.deliveryTotal === 0) return { customerId: c._id, customerName: c.name, phone: c.phone, laneId: c.laneId?._id || c.laneId, laneName, status: "NO_DELIVERIES", reason: "No delivered records in this period", estimatedAmount: 0, deliveryCount: 0 };
      return { customerId: c._id, customerName: c.name, phone: c.phone, laneId: c.laneId?._id || c.laneId, laneName, status: "ELIGIBLE", reason: null, estimatedAmount: Math.round(delivery.deliveryTotal * 100) / 100, deliveryCount: delivery.deliveryCount };
    });
    const summary = { eligible: result.filter((r) => r.status === "ELIGIBLE").length, alreadyBilled: result.filter((r) => r.status === "ALREADY_BILLED").length, noDeliveries: result.filter((r) => r.status === "NO_DELIVERIES").length };
    return successResponse(res, "Preview ready", { customers: result, summary });
  } catch (error) {
    console.error("BULK PREVIEW ERROR:", error);
    return errorResponse(res, "Server error", 500);
  }
};

exports.bulkGenerate = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { customerIds, fromDate, toDate } = req.body;
    if (!customerIds?.length)    return errorResponse(res, "customerIds array required", 400);
    if (!fromDate || !toDate)    return errorResponse(res, "fromDate and toDate required", 400);
    if (customerIds.length > 200) return errorResponse(res, "Maximum 200 customers per bulk operation", 400);
    const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999);
    if (start >= end)    return errorResponse(res, "fromDate must be before toDate", 400);
    if (end > new Date()) return errorResponse(res, "Cannot generate bills for future dates", 400);
    const toMonthStr  = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`; };
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const objIds      = customerIds.map((id) => new mongoose.Types.ObjectId(id));
    const [customers, deliveryAgg, existingBills, allBills, allPayments] = await Promise.all([
      Customer.find({ _id: { $in: objIds }, tenantId }).lean(),
      DeliveryRecord.aggregate([
        { $match: { tenantId: tenantObjId, customerId: { $in: objIds }, date: { $gte: start, $lte: end }, status: "DELIVERED", isActive: true } },
        { $group: { _id: "$customerId", deliveryTotal: { $sum: { $multiply: ["$quantity", "$rate"] } }, items: { $push: { date: "$date", productName: { $ifNull: ["$productName", "Product"] }, quantity: "$quantity", rate: "$rate", amount: { $multiply: ["$quantity", "$rate"] } } } } },
      ]),
      Bill.find({ tenantId, customerId: { $in: objIds }, fromDate: { $lte: end }, toDate: { $gte: start } }).lean(),
      Bill.find({ tenantId, customerId: { $in: objIds } }).lean(),
      Payment.find({ tenantId, customerId: { $in: objIds }, isActive: true }).lean(),
    ]);
    const customerMap  = Object.fromEntries(customers.map((c) => [c._id.toString(), c]));
    const deliveryMap  = Object.fromEntries(deliveryAgg.map((d) => [d._id.toString(), d]));
    const billedSet    = new Set(existingBills.map((b) => b.customerId.toString()));
    const billsByCustomer = {}, paymentsByCustomer = {};
    allBills.forEach((b)    => { const k = b.customerId.toString(); (billsByCustomer[k]    = billsByCustomer[k]    || []).push(b); });
    allPayments.forEach((p) => { const k = p.customerId.toString(); (paymentsByCustomer[k] = paymentsByCustomer[k] || []).push(p); });
    const results = [], toInsert = [];
    for (const idStr of customerIds.map(String)) {
      const customer = customerMap[idStr];
      if (!customer)         { results.push({ customerId: idStr, status: "FAILED", reason: "Customer not found" }); continue; }
      if (billedSet.has(idStr)) { results.push({ customerId: idStr, customerName: customer.name, status: "SKIPPED", reason: "Already billed for this period" }); continue; }
      const delivery = deliveryMap[idStr];
      if (!delivery || delivery.deliveryTotal === 0) { results.push({ customerId: idStr, customerName: customer.name, status: "SKIPPED", reason: "No deliveries in period" }); continue; }
      const prevBills = billsByCustomer[idStr] || [], prevPayments = paymentsByCustomer[idStr] || [];
      const totalBilled = prevBills.reduce((s, b) => s + b.totalAmount, 0);
      const totalPaid   = prevPayments.reduce((s, p) => s + p.amount, 0);
      const advance     = Math.max(0, totalPaid - totalBilled);
      const delivTotal  = Math.round(delivery.deliveryTotal * 100) / 100;
      const usedAdvance = Math.min(advance, delivTotal);
      const amountPaid  = Math.round(usedAdvance * 100) / 100;
      let status = "UNPAID";
      if (amountPaid >= delivTotal) status = "PAID";
      else if (amountPaid > 0)      status = "PARTIAL";
      toInsert.push({ tenantId, customerId: customer._id, laneId: customer.laneId, fromDate: start, toDate: end, month: toMonthStr(start), deliveryItems: delivery.items.map((i) => ({ ...i, amount: Math.round(i.amount * 100) / 100 })), deliveryTotal: delivTotal, totalAmount: delivTotal, amountPaid, status, _customerName: customer.name });
    }
    if (toInsert.length) {
      try {
        const insertedBills = await Bill.insertMany(toInsert.map(({ _customerName, ...b }) => b), { ordered: false });
        const insertMap = Object.fromEntries(insertedBills.map((b) => [b.customerId.toString(), b]));
        toInsert.forEach((item) => {
          const inserted = insertMap[item.customerId.toString()];
          results.push({ customerId: item.customerId, customerName: item._customerName, billId: inserted?._id, status: "SUCCESS", amount: item.totalAmount, billStatus: item.status });
        });
      } catch (bulkErr) {
        const successIds = new Set((bulkErr.insertedDocs || []).map((d) => d.customerId.toString()));
        toInsert.forEach((item) => {
          const idStr = item.customerId.toString();
          results.push(successIds.has(idStr)
            ? { customerId: item.customerId, customerName: item._customerName, status: "SUCCESS", amount: item.totalAmount, billStatus: item.status }
            : { customerId: item.customerId, customerName: item._customerName, status: "FAILED", reason: "Duplicate or DB error" });
        });
      }
    }
    const summary = { success: results.filter((r) => r.status === "SUCCESS").length, skipped: results.filter((r) => r.status === "SKIPPED").length, failed: results.filter((r) => r.status === "FAILED").length, billIds: results.filter((r) => r.billId).map((r) => r.billId) };
    return successResponse(res, "Bulk generation complete", { results, summary });
  } catch (error) {
    console.error("BULK GENERATE ERROR:", error);
    return errorResponse(res, "Server error", 500);
  }
};

// ─── bulkDownloadZip ──────────────────────────────────────────────────────────
// FIX: populate laneId so each PDF gets the correct lane name in filename
exports.bulkDownloadZip = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { billIds, zipName } = req.body;
    if (!billIds?.length)     return errorResponse(res, "billIds array required", 400);
    if (billIds.length > 200) return errorResponse(res, "Maximum 200 bills per download", 400);

    const bills = await Bill.find({ _id: { $in: billIds }, tenantId })
      .populate("customerId", "name phone")
      .populate("laneId",     "name")       // ← was missing before
      .lean();

    if (!bills.length) return errorResponse(res, "No bills found", 404);

    const safeZipName = (zipName || "Bulk_Bills").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Bulk_Bills";
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeZipName}.zip"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => { console.error("ZIP ERROR:", err); if (!res.headersSent) res.status(500).end(); });
    archive.pipe(res);

    for (const bill of bills) {
      try {
        const laneName  = bill.laneId?.name || "";
        const pdfBuffer = await buildBillPdfBuffer(bill, laneName);
        const filename  = buildBillFilename(bill, laneName);
        archive.append(pdfBuffer, { name: filename });
      } catch (pdfErr) {
        console.error(`PDF error for bill ${bill._id}:`, pdfErr);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("BULK DOWNLOAD ERROR:", error);
    if (!res.headersSent) return errorResponse(res, "Server error", 500);
  }
};