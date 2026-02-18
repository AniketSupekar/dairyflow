const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "BANK", "OTHER"],
      default: "CASH",
    },

    date: {
      type: Date,
      required: true,
    },

    note: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

paymentSchema.index({ tenantId: 1 });
paymentSchema.index({ customerId: 1, date: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
