const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Product        = require("../products/product.model");
const Customer       = require("../customers/customer.model");
const Lane           = require("../lanes/lane.model");
const Bill           = require("../billing/bill.model");
const { successResponse } = require("../../utils/response.util");
const mongoose       = require("mongoose");

const isToday = (date) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setUTCHours(0, 0, 0, 0);
  return today.getTime() === compare.getTime();
};

exports.upsertDeliveryRecord = async (req, res) => {
  try {
    const { customerId, productId, quantity, status, date } = req.body;
    const { tenantId, role, assignedLanes } = req.user;

    if (!customerId || !productId || !date)
      return res.status(400).json({ success: false, message: "Missing required fields" });
    if (!quantity || quantity <= 0)
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    if (role === "USER" && !isToday(normalizedDate))
      return res.status(403).json({ success: false, message: "You can only enter or edit today's delivery" });

    // Fetch customer + check bill existence in parallel — saves 1 roundtrip
    const [customer, billExists] = await Promise.all([
      Customer.findOne({ _id: customerId, tenantId }).lean(),
      Bill.exists({
        tenantId, customerId,
        fromDate: { $lte: normalizedDate },
        toDate:   { $gte: normalizedDate },
      }),
    ]);

    if (!customer || !customer.isActive)
      return res.status(400).json({ success: false, message: "Customer is inactive or not found" });

    if (role === "USER") {
      const laneAllowed = assignedLanes.some((laneId) => laneId.toString() === customer.laneId.toString());
      if (!laneAllowed)
        return res.status(403).json({ success: false, message: "Not allowed to access this lane" });
    }

    // ── Lane active check removed ──────────────────────────────────────────
    // Previous code fetched Lane separately (extra DB call).
    // If a lane is deactivated, its customers are also deactivated — the
    // customer.isActive check above already covers this case.
    // Removing this saves 1 DB roundtrip on every delivery record upsert.

    if (billExists)
      return res.status(400).json({ success: false, message: "Cannot modify delivery after bill generated" });

    const product = await Product.findOne({ _id: productId, tenantId }).lean();
    if (!product || !product.isActive)
      return res.status(400).json({ success: false, message: "Invalid or inactive product" });

    const record = await DeliveryRecord.findOneAndUpdate(
      { tenantId, customerId, productId, date: normalizedDate },
      {
        tenantId, laneId: customer.laneId, customerId, productId,
        quantity, rate: product.rate, status, date: normalizedDate, isActive: true,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: record });
  } catch (error) {
    console.error("UPSERT DELIVERY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getDeliveriesByDate = async (req, res) => {
  try {
    const { date, laneId } = req.query;
    const { tenantId, role, assignedLanes } = req.user;

    if (!date || !laneId)
      return res.status(400).json({ success: false, message: "Date and laneId required" });

    if (role === "USER") {
      const allowed = assignedLanes.some((id) => id.toString() === laneId.toString());
      if (!allowed)
        return res.status(403).json({ success: false, message: "Not allowed to access this lane" });
    }

    const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
    const end   = new Date(date); end.setUTCHours(23, 59, 59, 999);

    const records = await DeliveryRecord.find({
      tenantId, laneId, date: { $gte: start, $lte: end }, isActive: true,
    })
      .populate("customerId", "name laneId")
      .populate("productId",  "name rate")
      .lean();

    res.json({ success: true, data: records.filter((r) => r.customerId) });
  } catch (error) {
    console.error("GET DELIVERY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateDeliveryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, role, assignedLanes } = req.user;

    const existing = await DeliveryRecord.findOne({ _id: id, tenantId });
    if (!existing)
      return res.status(404).json({ success: false, message: "Delivery record not found" });

    if (role === "USER") {
      const customer = await Customer.findOne({ _id: existing.customerId, tenantId }).lean();
      const allowed  = assignedLanes.some((laneId) => laneId.toString() === customer.laneId.toString());
      if (!allowed || !isToday(existing.date))
        return res.status(403).json({ success: false, message: "Not allowed to edit this record" });
    }

    const billExists = await Bill.exists({
      tenantId, customerId: existing.customerId,
      fromDate: { $lte: existing.date }, toDate: { $gte: existing.date },
    });
    if (billExists)
      return res.status(400).json({ success: false, message: "Cannot edit delivery after bill generated" });

    const { quantity, status } = req.body;
    const updateFields = {};
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (status   !== undefined) updateFields.status   = status;

    const updated = await DeliveryRecord.findOneAndUpdate(
      { _id: id, tenantId }, updateFields, { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE DELIVERY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteDeliveryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, role, assignedLanes } = req.user;

    const existing = await DeliveryRecord.findOne({ _id: id, tenantId });
    if (!existing)
      return res.status(404).json({ success: false, message: "Delivery record not found" });

    if (role === "USER") {
      const customer = await Customer.findOne({ _id: existing.customerId, tenantId }).lean();
      const allowed  = assignedLanes.some((laneId) => laneId.toString() === customer.laneId.toString());
      if (!allowed || !isToday(existing.date))
        return res.status(403).json({ success: false, message: "Not allowed to delete this record" });
    }

    const billExists = await Bill.exists({
      tenantId, customerId: existing.customerId,
      fromDate: { $lte: existing.date }, toDate: { $gte: existing.date },
    });
    if (billExists)
      return res.status(400).json({ success: false, message: "Cannot delete delivery after bill generated" });

    existing.isActive = false;
    await existing.save();
    res.json({ success: true, message: "Delivery deleted" });
  } catch (error) {
    console.error("DELETE DELIVERY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyDeliveryStats = async (req, res) => {
  try {
    const { tenantId, assignedLanes } = req.user;

    if (!assignedLanes || assignedLanes.length === 0)
      return res.json({ success: true, data: { deliveredToday: 0, totalToday: 0 } });

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

    const [deliveredToday, totalToday] = await Promise.all([
      DeliveryRecord.countDocuments({
        tenantId, laneId: { $in: assignedLanes },
        date: { $gte: todayStart, $lte: todayEnd },
        status: "DELIVERED", isActive: true,
      }),
      DeliveryRecord.countDocuments({
        tenantId, laneId: { $in: assignedLanes },
        date: { $gte: todayStart, $lte: todayEnd },
        isActive: true,
      }),
    ]);

    return res.json({ success: true, data: { deliveredToday, totalToday } });
  } catch (error) {
    console.error("MY STATS ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getDailySummary = async (req, res) => {
  try {
    const tenantId    = req.tenantId;
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const dateParam   = req.query.date;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const [deliveryAgg, lanes, customerCountAgg] = await Promise.all([
      DeliveryRecord.aggregate([
        { $match: { tenantId: tenantObjId, date: { $gte: targetDate, $lte: dayEnd }, isActive: true } },
        { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "customer" } },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "products",  localField: "productId",  foreignField: "_id", as: "product"  } },
        { $unwind: { path: "$product",  preserveNullAndEmptyArrays: true } },
        { $group: {
            _id: "$laneId",
            delivered:    { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] },     1, 0] } },
            notDelivered: { $sum: { $cond: [{ $eq: ["$status", "NOT_DELIVERED"] }, 1, 0] } },
            holiday:      { $sum: { $cond: [{ $eq: ["$status", "HOLIDAY"] },       1, 0] } },
            customers: {
              $push: {
                customerId:   "$customerId",
                customerName: { $ifNull: ["$customer.name", "Deleted Customer"] },
                status:       "$status",
                quantity:     "$quantity",
                productName:  { $ifNull: ["$product.name", "Product"] },
              },
            },
        }},
      ]),
      Lane.find({ tenantId, isActive: true }).lean(),
      Customer.aggregate([
        { $match: { tenantId: tenantObjId, isActive: true } },
        { $group: { _id: "$laneId", count: { $sum: 1 } } },
      ]),
    ]);

    const deliveryMap      = Object.fromEntries(deliveryAgg.map((d) => [d._id?.toString(), d]));
    const customerCountMap = Object.fromEntries(customerCountAgg.map((c) => [c._id?.toString(), c.count]));
    const order            = { DELIVERED: 0, NOT_DELIVERED: 1, HOLIDAY: 2 };

    const laneResults = lanes.map((lane) => {
      const laneKey        = lane._id.toString();
      const rec            = deliveryMap[laneKey] || { delivered: 0, notDelivered: 0, holiday: 0, customers: [] };
      const totalCustomers = customerCountMap[laneKey] || 0;
      const recorded       = rec.delivered + rec.notDelivered + rec.holiday;
      const notRecorded    = Math.max(0, totalCustomers - recorded);
      return {
        laneId: lane._id, laneName: lane.name, totalCustomers,
        delivered: rec.delivered, notDelivered: rec.notDelivered,
        holiday: rec.holiday, notRecorded,
        isComplete: totalCustomers > 0 && notRecorded === 0,
        customers: [...rec.customers].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)),
      };
    }).sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      return b.notRecorded - a.notRecorded;
    });

    const summary = {
      totalDelivered:    laneResults.reduce((s, l) => s + l.delivered,    0),
      totalNotDelivered: laneResults.reduce((s, l) => s + l.notDelivered, 0),
      totalHoliday:      laneResults.reduce((s, l) => s + l.holiday,      0),
      totalNotRecorded:  laneResults.reduce((s, l) => s + l.notRecorded,  0),
      completeLanes:     laneResults.filter((l) => l.isComplete).length,
      totalLanes:        laneResults.length,
    };

    return successResponse(res, "Daily summary fetched", {
      date: targetDate.toISOString().split("T")[0], lanes: laneResults, summary,
    });
  } catch (error) {
    console.error("DAILY SUMMARY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};