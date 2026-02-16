const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Product = require("../products/product.model");
const { successResponse } = require("../../utils/response.util");

exports.upsertDeliveryRecord = async (req, res) => {
  try {
    const { customerId, productId, quantity, rate, status, date } = req.body;
    const tenantId = req.user.tenantId;

    if (!customerId || !productId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Normalize to UTC midnight
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const record = await DeliveryRecord.findOneAndUpdate(
      { tenantId, customerId, productId, date: normalizedDate },
      {
        tenantId,
        customerId,
        productId,
        quantity,
        rate,
        status,
        date: normalizedDate,
        isActive: true,
      },
      { upsert: true, new: true }
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
    const tenantId = req.user.tenantId;

    if (!date || !laneId) {
      return res.status(400).json({
        success: false,
        message: "Date and laneId required",
      });
    }

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const records = await DeliveryRecord.find({
      tenantId,
      date: { $gte: start, $lte: end },
      isActive: true,
    })
      .populate({
        path: "customerId",
        match: { laneId },
        select: "name laneId",
      })
      .populate("productId", "name rate");

    // Remove records whose customer didn't match lane
    const filtered = records.filter(r => r.customerId);

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error("GET DELIVERY ERROR:", error);
    res.status(500).json({ success: false });
  }
};

exports.updateDeliveryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const record = await DeliveryRecord.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Delivery record not found",
      });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error("UPDATE DELIVERY ERROR:", error);
    res.status(500).json({ success: false });
  }
};

exports.deleteDeliveryRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const record = await DeliveryRecord.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Delivery record not found",
      });
    }

    res.json({ success: true, message: "Delivery deleted" });
  } catch (error) {
    console.error("DELETE DELIVERY ERROR:", error);
    res.status(500).json({ success: false });
  }
};
