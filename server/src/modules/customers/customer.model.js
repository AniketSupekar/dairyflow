const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
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

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    laneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lane",
      required: true,
      index: true,
    },

    subscriptions: [subscriptionSchema],

    openingBalance: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ tenantId: 1 });
customerSchema.index({ phone: 1, tenantId: 1 }, { unique: true });
customerSchema.index({ laneId: 1, tenantId: 1 });

module.exports = mongoose.model("Customer", customerSchema);
