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
      min: [0, "Quantity must be 0 or greater"],
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

// ─── HOLIDAY quantity enforcement ─────────────────────────────────────────────
// HOLIDAY and NOT_DELIVERED records should always store quantity = 0.
// This keeps billing correct (only DELIVERED records contribute to bill total)
// and keeps raw data clean for any future reporting queries.
deliveryRecordSchema.pre("save", function (next) {
  if (this.status === "HOLIDAY" || this.status === "NOT_DELIVERED") {
    this.quantity = 0;
  }
  next();
});

// Also enforce on findOneAndUpdate (upsert path in upsertDeliveryRecord)
deliveryRecordSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  const status = update?.status ?? update?.$set?.status;
  if (status === "HOLIDAY" || status === "NOT_DELIVERED") {
    if (!update.$set) update.$set = {};
    update.$set.quantity = 0;
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique: one record per customer+product per day
deliveryRecordSchema.index(
  { tenantId: 1, customerId: 1, productId: 1, date: 1 },
  { unique: true }
);

// Lane-date queries (getDeliveriesByDate)
deliveryRecordSchema.index({ tenantId: 1, laneId: 1, date: 1 });

// ADDED: getDailySummary matches { tenantId, date, isActive } across ALL lanes.
// Without this index that query scans every delivery record for the tenant.
// At 1 year of data (22k records) this becomes a noticeable scan.
deliveryRecordSchema.index({ tenantId: 1, date: 1, isActive: 1 });

module.exports = mongoose.model("DeliveryRecord", deliveryRecordSchema);