const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Product = require("../products/product.model");
const { successResponse } = require("../../utils/response.util");

exports.createDailyDeliveries = async (req, res) => {
  try {
    const { date, entries } = req.body;
    const tenantId = req.user.tenantId; // from auth middleware

    const deliveryDate = new Date(date);

    for (const entry of entries) {
      const product = await Product.findOne({
        _id: entry.productId,
        tenantId,
      });

      if (!product) {
        return res.status(400).json({ message: "Invalid product" });
      }

      try {
        await DeliveryRecord.create({
          tenantId,
          customerId: entry.customerId,
          productId: entry.productId,
          quantity: entry.quantity,
          rate: product.rate,
          status: entry.status,
          date: deliveryDate,
        });
      } catch (err) {
        if (err.code === 11000) {
          return res.status(400).json({
            message: "Duplicate delivery record detected",
          });
        }
        throw err;
      }
    }

    res.json({ message: "Deliveries recorded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDeliveryByDate = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId, date } = req.query;

    if (!laneId || !date) {
      return res.status(400).json({
        success: false,
        message: "laneId and date are required",
      });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const deliveries = await DeliveryRecord.find({
      tenantId,
      date: { $gte: start, $lte: end },
    })
      .populate({
        path: "customerId",
        match: { laneId: new mongoose.Types.ObjectId(laneId) },
        select: "name laneId",
      })
      .populate("productId", "name rate");

    const filtered = deliveries.filter(d => d.customerId !== null);

    res.json({
      success: true,
      data: filtered,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};