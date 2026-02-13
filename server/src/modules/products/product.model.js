const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
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

    unit: {
      type: String, // litre, packet
      required: true,
    },

    rate: {
      type: Number,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ tenantId: 1 });
productSchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);