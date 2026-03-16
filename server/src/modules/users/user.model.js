const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    name:     { type: String, required: true, trim: true },
    phone:    { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role:     { type: String, enum: ["ADMIN", "USER"], default: "USER" },
    assignedLanes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lane" }],
    isActive: { type: Boolean, default: true },

    // ── Password reset ──────────────────────────────────────────────────────
    // Token is stored hashed — raw token sent in email, never stored plain
    resetToken:       { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date,   default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("passwordHash")) return next();
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  } catch (err) { return next(err); }
});

userSchema.index({ tenantId: 1 });
userSchema.index({ phone: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);