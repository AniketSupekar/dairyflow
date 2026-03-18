const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    name:         { type: String, required: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["ADMIN", "USER"], default: "USER" },
    assignedLanes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lane" }],
    isActive:     { type: Boolean, default: true },

    // ── Password reset ──────────────────────────────────────────────────────
    resetToken:       { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date,   default: null, select: false },
  },
  { timestamps: true }
);

// Only hash passwordHash when it has actually been modified
// Using async/await without next parameter — cleaner and avoids
// the "next is not a function" bug when save() is called with options
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.index({ tenantId: 1 });
userSchema.index({ phone: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);