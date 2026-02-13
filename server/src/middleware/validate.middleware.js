const mongoose = require("mongoose");

exports.validateDeliveryInput = (req, res, next) => {
  const { date, entries } = req.body;

  if (!date || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery payload",
    });
  }

  for (const entry of entries) {
    if (
      !mongoose.Types.ObjectId.isValid(entry.customerId) ||
      !mongoose.Types.ObjectId.isValid(entry.productId) ||
      typeof entry.quantity !== "number" ||
      entry.quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery entry data",
      });
    }
  }

  next();
};