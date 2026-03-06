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
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Primary lookup: every payment query scopes to tenantId + customerId
paymentSchema.index({ tenantId: 1, customerId: 1, date: -1 });

// Duplicate detection: tenantId + customerId + amount + date
paymentSchema.index({ tenantId: 1, customerId: 1, amount: 1, date: 1 });

// ADDED: recalculateBillAllocations and getOutstandingList both query
// { tenantId, customerId, isActive: true } — isActive in the index means
// Mongo can satisfy the filter without loading inactive payment docs.
paymentSchema.index({ tenantId: 1, customerId: 1, isActive: 1, date: 1 });

module.exports = mongoose.model("Payment", paymentSchema);