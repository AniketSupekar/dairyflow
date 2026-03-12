/**
 * modules/tenants/tenant.model.js
 *
 * Complete tenant schema. Replaces the minimal version.
 *
 * What's new vs old schema:
 *   + address          — shown on PDF bills
 *   + logoUrl          — Cloudinary URL, used in PDF + settings UI
 *   + logoPublicId     — Cloudinary public_id, needed for deletion on replace
 *   + invoicePrefix    — e.g. "INV" → bill numbers like INV-001
 *   + plan             — free/pro/enterprise, ready for subscriptions
 *   + trialEndsAt      — 30-day trial auto-set on signup
 *
 * Existing fields kept identical so no migration needed on live data.
 */

const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    // ── Core identity ─────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, "Business name is required"],
      trim:      true,
      maxlength: [100, "Business name cannot exceed 100 characters"],
    },
    contactName: {
      type:      String,
      required:  [true, "Owner name is required"],
      trim:      true,
      maxlength: [100, "Owner name cannot exceed 100 characters"],
    },
    phone: {
      type:    String,
      required:[true, "Phone number is required"],
      trim:    true,
      match:   [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"],
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    address: {
      type:      String,
      trim:      true,
      maxlength: [300, "Address cannot exceed 300 characters"],
      default:   "",
    },

    // ── Branding ──────────────────────────────────────────────────────────────
    logoUrl: {
      type:    String,
      default: "", // empty = use app default logo in PDFs
    },
    logoPublicId: {
      type:    String,
      default: "", // Cloudinary public_id — stored for deletion on logo replace
    },

    // ── Invoice customization ─────────────────────────────────────────────────
    invoicePrefix: {
      type:      String,
      trim:      true,
      uppercase: true,
      default:   "INV",
      maxlength: [6, "Prefix cannot exceed 6 characters"],
    },

     upiId: {
      type:      String,
      trim:      true,
      default:   "",
      maxlength: [100, "UPI ID cannot exceed 100 characters"],
      // Basic VPA validation: something@something
      match: [/^$|^[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9]+$/, "Enter a valid UPI ID (e.g. 9876543210@ybl)"],
    },

    // ── Plan management ───────────────────────────────────────────────────────
    // No payment logic yet — fields are ready for when subscriptions are added.
    plan: {
      type:    String,
      enum:    ["free", "pro", "enterprise"],
      default: "free",
    },
    trialEndsAt: {
      type:    Date,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 30); // 30-day free trial from signup
        return d;
      },
    },

    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
tenantSchema.index({ email: 1 }, { unique: true });
tenantSchema.index({ phone: 1 }, { unique: true });
tenantSchema.index({ isActive: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
// Convenience aliases for PDF builder and API responses
tenantSchema.virtual("businessName").get(function () {
  return this.name;
});
tenantSchema.virtual("ownerName").get(function () {
  return this.contactName;
});
tenantSchema.virtual("isTrialActive").get(function () {
  return this.plan === "free" && new Date() < this.trialEndsAt;
});

module.exports = mongoose.model("Tenant", tenantSchema);