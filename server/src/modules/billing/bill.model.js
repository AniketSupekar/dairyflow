const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    laneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lane",
      required: true,
    },

    // ✅ YYYY-MM string derived from fromDate — used for display and filtering
    month: {
      type: String,
      index: true,
    },

    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },

    deliveryItems: [
      {
        date: { type: Date },
        productName: String,
        quantity: Number,
        rate: Number,
        amount: Number,
      },
    ],

    deliveryTotal: { type: Number, required: true },

    totalAmount: { type: Number, required: true },

    amountPaid: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

billSchema.index({ tenantId: 1, customerId: 1 });
billSchema.index(
  { tenantId: 1, customerId: 1, fromDate: 1, toDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Bill", billSchema);