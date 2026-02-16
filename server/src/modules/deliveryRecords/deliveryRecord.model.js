const mongoose = require("mongoose");

const deliveryRecordSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
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
    },

    rate: {
      type: Number,
      required: true, // snapshot of product rate at delivery time
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

// prevent duplicate delivery entry for same customer + date + product
deliveryRecordSchema.index(
  { tenantId: 1, customerId: 1, productId: 1, date: 1 },
  { unique: true }
);

deliveryRecordSchema.index({ tenantId: 1 });
deliveryRecordSchema.index({ customerId: 1, date: 1 });
deliveryRecordSchema.index({ tenantId: 1, date: 1 });
deliveryRecordSchema.index({ tenantId: 1, customerId: 1, date: 1 });

module.exports = mongoose.model("DeliveryRecord", deliveryRecordSchema);