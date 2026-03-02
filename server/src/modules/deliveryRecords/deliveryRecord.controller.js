const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Product = require("../products/product.model");
const { successResponse } = require("../../utils/response.util");
const Customer = require("../customers/customer.model");
const Lane = require("../lanes/lane.model");
const Bill = require("../billing/bill.model");

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

    if (!customerId || !productId || !date) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    if (role === "USER" && !isToday(normalizedDate)) {
      return res.status(403).json({ success: false, message: "You can only enter or edit today's delivery" });
    }

    const customer = await Customer.findOne({ _id: customerId, tenantId }).lean();
    if (!customer || !customer.isActive) {
      return res.status(400).json({ success: false, message: "Customer is inactive or not found" });
    }

    if (role === "USER") {
      const laneAllowed = assignedLanes.some(
        (laneId) => laneId.toString() === customer.laneId.toString()
      );
      if (!laneAllowed) {
        return res.status(403).json({ success: false, message: "Not allowed to access this lane" });
      }
    }

    const lane = await Lane.findOne({ _id: customer.laneId, tenantId }).lean();
    if (!lane || !lane.isActive) {
      return res.status(400).json({ success: false, message: "Customer lane is inactive" });
    }

    const billExists = await Bill.exists({
      tenantId, customerId,
      fromDate: { $lte: normalizedDate },
      toDate: { $gte: normalizedDate },
    });
    if (billExists) {
      return res.status(400).json({ success: false, message: "Cannot modify delivery after bill generated" });
    }

    const product = await Product.findOne({ _id: productId, tenantId }).lean();
    if (!product || !product.isActive) {
      return res.status(400).json({ success: false, message: "Invalid or inactive product" });
    }

    const record = await DeliveryRecord.findOneAndUpdate(
      { tenantId, customerId, productId, date: normalizedDate },
      {
        tenantId,
        laneId: customer.laneId,
        customerId,
        productId,
        quantity,
        rate: product.rate,
        status,
        date: normalizedDate,
        isActive: true,
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

    if (!date || !laneId) {
      return res.status(400).json({ success: false, message: "Date and laneId required" });
    }

    if (role === "USER") {
      const allowed = assignedLanes.some((id) => id.toString() === laneId.toString());
      if (!allowed) {
        return res.status(403).json({ success: false, message: "Not allowed to access this lane" });
      }
    }

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const records = await DeliveryRecord.find({
      tenantId, laneId,
      date: { $gte: start, $lte: end },
      isActive: true,
    })
      .populate("customerId", "name laneId")
      .populate("productId", "name rate")
      .lean();

    // FIX: single response, filter out records where customer was deleted
    const filtered = records.filter((r) => r.customerId);
    res.json({ success: true, data: filtered });
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
    if (!existing) {
      return res.status(404).json({ success: false, message: "Delivery record not found" });
    }

    if (role === "USER") {
      const customer = await Customer.findOne({ _id: existing.customerId, tenantId }).lean();
      const allowed = assignedLanes.some(
        (laneId) => laneId.toString() === customer.laneId.toString()
      );
      if (!allowed || !isToday(existing.date)) {
        return res.status(403).json({ success: false, message: "Not allowed to edit this record" });
      }
    }

    const billExists = await Bill.exists({
      tenantId,
      customerId: existing.customerId,
      fromDate: { $lte: existing.date },
      toDate: { $gte: existing.date },
    });
    if (billExists) {
      return res.status(400).json({ success: false, message: "Cannot edit delivery after bill generated" });
    }

    // Whitelist only safe fields
    const { quantity, status } = req.body;
    const updateFields = {};
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (status !== undefined) updateFields.status = status;

    const updated = await DeliveryRecord.findOneAndUpdate(
      { _id: id, tenantId },
      updateFields,
      { new: true, runValidators: true }
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
    if (!existing) {
      return res.status(404).json({ success: false, message: "Delivery record not found" });
    }

    if (role === "USER") {
      const customer = await Customer.findOne({ _id: existing.customerId, tenantId }).lean();
      const allowed = assignedLanes.some(
        (laneId) => laneId.toString() === customer.laneId.toString()
      );
      if (!allowed || !isToday(existing.date)) {
        return res.status(403).json({ success: false, message: "Not allowed to delete this record" });
      }
    }

    const billExists = await Bill.exists({
      tenantId,
      customerId: existing.customerId,
      fromDate: { $lte: existing.date },
      toDate: { $gte: existing.date },
    });
    if (billExists) {
      return res.status(400).json({ success: false, message: "Cannot delete delivery after bill generated" });
    }

    existing.isActive = false;
    await existing.save();

    res.json({ success: true, message: "Delivery deleted" });
  } catch (error) {
    console.error("DELETE DELIVERY ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── User's personal delivery stats for today ─────────────────────────────────
// Called by UserDashboard. Returns counts across all of the user's assigned lanes.
exports.getMyDeliveryStats = async (req, res) => {
  try {
    const { tenantId, assignedLanes } = req.user;

    if (!assignedLanes || assignedLanes.length === 0) {
      return res.json({ success: true, data: { deliveredToday: 0, totalToday: 0 } });
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [deliveredToday, totalToday] = await Promise.all([
      // How many marked DELIVERED today across my lanes
      DeliveryRecord.countDocuments({
        tenantId,
        laneId: { $in: assignedLanes },
        date: { $gte: todayStart, $lte: todayEnd },
        status: "DELIVERED",
        isActive: true,
      }),
      // Total records entered today across my lanes (any status)
      DeliveryRecord.countDocuments({
        tenantId,
        laneId: { $in: assignedLanes },
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