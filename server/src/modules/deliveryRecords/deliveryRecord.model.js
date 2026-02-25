const mongoose = require("mongoose");

const deliveryRecordSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    laneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lane",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, "Quantity must be greater than 0"],
    },

    rate: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["DELIVERED", "NOT_DELIVERED", "HOLIDAY"],
      default: "DELIVERED",
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

deliveryRecordSchema.index(
  { tenantId: 1, customerId: 1, productId: 1, date: 1 },
  { unique: true }
);

deliveryRecordSchema.index({ tenantId: 1, laneId: 1, date: 1 });

module.exports = mongoose.model("DeliveryRecord", deliveryRecordSchema);