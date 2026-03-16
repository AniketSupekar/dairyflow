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
 * MATCHES user.model.js exactly:
 *   - field is `passwordHash` not `password`
 *   - role enum is "ADMIN" not "admin"
 *   - no `email` field on User model — stored on Tenant only
 *   - pre-save hook hashes passwordHash automatically — pass plain text
 */

const mongoose     = require("mongoose");
const jwt          = require("jsonwebtoken");
const Tenant       = require("../tenants/tenant.model");
const User         = require("../users/user.model");
const asyncHandler = require("../../utils/async.util");
const { successResponse, errorResponse } = require("../../utils/response.util");
const { JWT_SECRET } = require("../../config/env");

exports.register = asyncHandler(async (req, res) => {
  const { businessName, ownerName, phone, email, password } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
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

  // ── Duplicate check ───────────────────────────────────────────────────────
  const [emailTaken, phoneTaken] = await Promise.all([
    Tenant.exists({ email: email.toLowerCase().trim() }),
    Tenant.exists({ phone: phone.trim() }),
  ]);
  if (emailTaken) return errorResponse(res, "An account with this email already exists", 409);
  if (phoneTaken) return errorResponse(res, "An account with this phone already exists", 409);

  // ── Atomic creation ───────────────────────────────────────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [tenant] = await Tenant.create(
      [{
        name:        businessName.trim(),
        contactName: ownerName.trim(),
        phone:       phone.trim(),
        email:       email.toLowerCase().trim(),
      }],
      { session }
    );

    // User model uses `passwordHash` — pre-save hook hashes it automatically
    // Role enum is "ADMIN" uppercase — must match exactly
    await User.create(
      [{
        tenantId:     tenant._id,
        name:         ownerName.trim(),
        phone:        phone.trim(),
        passwordHash: password,   // plain text — pre-save hook hashes it
        role:         "ADMIN",    // uppercase — matches enum in user.model.js
        isActive:     true,
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Issue JWT — role lowercase to match auth.controller.js login behavior
    const token = jwt.sign(
      {
        userId:        tenant._id,   // consistent with login JWT shape
        tenantId:      tenant._id,
        role:          "admin",      // lowercase — matches ProtectedRoute check
        assignedLanes: [],           // empty for admin, consistent with login JWT
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return successResponse(
      res,
      "Account created successfully. Welcome to DairyFlow!",
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
    if (err.code === 11000) {
      return errorResponse(res, "An account with this email or phone already exists", 409);
    }
    throw err;
  }
});