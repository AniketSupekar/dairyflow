const mongoose = require("mongoose");

const laneSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
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

laneSchema.index({ tenantId: 1 });
laneSchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("Lane", laneSchema);