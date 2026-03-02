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
// FIX: always include tenantId — every query filters by tenantId + customerId.
// The old index { customerId, date } scanned across all tenants for that customer.
paymentSchema.index({ tenantId: 1, customerId: 1, date: -1 });

// For duplicate detection query: tenantId + customerId + amount + date + createdAt
paymentSchema.index({ tenantId: 1, customerId: 1, amount: 1, date: 1 });

module.exports = mongoose.model("Payment", paymentSchema);