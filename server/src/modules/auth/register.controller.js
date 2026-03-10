/**
 * modules/auth/register.controller.js
 *
 * Self-serve tenant registration.
 * New dairy owner signs up → Tenant + admin User created atomically.
 * They're immediately logged in — no second step needed.
 *
 * POST /api/auth/register
 * Body: { businessName, ownerName, phone, email, password }
 *
 * Wire into auth.routes.js:
 *   const { register } = require("./register.controller");
 *   const { authLimiter } = require("../../middleware/rateLimit.middleware");
 *   router.post("/register", authLimiter, register);
 */

const mongoose    = require("mongoose");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const Tenant      = require("../tenants/tenant.model");
const User        = require("../users/user.model");
const asyncHandler = require("../../utils/async.util");
const { successResponse, errorResponse } = require("../../utils/response.util");
const { JWT_SECRET } = require("../../config/env");

exports.register = asyncHandler(async (req, res) => {
  const { businessName, ownerName, phone, email, password } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  const missing = ["businessName", "ownerName", "phone", "email", "password"]
    .filter((f) => !req.body[f]?.trim());
  if (missing.length) {
    return errorResponse(res, `Missing required fields: ${missing.join(", ")}`, 400);
  }
  if (password.length < 8) {
    return errorResponse(res, "Password must be at least 8 characters", 400);
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return errorResponse(res, "Enter a valid 10-digit Indian mobile number", 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return errorResponse(res, "Enter a valid email address", 400);
  }

  // ── Duplicate check (parallel for speed) ───────────────────────────────────
  const [emailTaken, phoneTaken] = await Promise.all([
    Tenant.exists({ email: email.toLowerCase().trim() }),
    Tenant.exists({ phone: phone.trim() }),
  ]);
  if (emailTaken) return errorResponse(res, "An account with this email already exists", 409);
  if (phoneTaken) return errorResponse(res, "An account with this phone already exists", 409);

  // ── Atomic creation — Tenant + Admin User in one transaction ────────────────
  // If User creation fails, Tenant is also rolled back. No orphaned records.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const [tenant] = await Tenant.create(
      [{
        name:        businessName.trim(),
        contactName: ownerName.trim(),
        phone:       phone.trim(),
        email:       email.toLowerCase().trim(),
      }],
      { session }
    );

    // First user for this tenant is always admin
    await User.create(
      [{
        tenantId: tenant._id,
        name:     ownerName.trim(),
        email:    email.toLowerCase().trim(),
        phone:    phone.trim(),
        password: passwordHash,
        role:     "admin",
        isActive: true,
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Issue JWT immediately — owner is logged in right after signup
    const token = jwt.sign(
      { userId: tenant._id, tenantId: tenant._id, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return successResponse(
      res,
      "Account created successfully. Welcome aboard!",
      {
        token,
        user: {
          id:           tenant._id,
          businessName: tenant.name,
          ownerName:    tenant.contactName,
          email:        tenant.email,
          role:         "admin",
          plan:         tenant.plan,
          trialEndsAt:  tenant.trialEndsAt,
        },
      },
      201
    );

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Mongoose/MongoDB duplicate key — race condition between check and insert
    if (err.code === 11000) {
      return errorResponse(res, "An account with this email or phone already exists", 409);
    }
    throw err;
  }
});