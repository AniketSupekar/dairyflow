/**
 * modules/auth/forgot-password.controller.js
 *
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Flow:
 *   1. Find tenant by email
 *   2. Find admin user for that tenant
 *   3. Generate crypto token → store hashed on user (expires in 1 hour)
 *   4. Send reset email via Resend with link containing raw token
 *
 * Security:
 *   - Always returns 200 even if email not found (prevents email enumeration)
 *   - Token is hashed in DB — raw token only in email
 *   - Token expires in 1 hour
 */

const crypto       = require("crypto");
const { Resend }   = require("resend");
const Tenant       = require("../tenants/tenant.model");
const User         = require("../users/user.model");
const asyncHandler = require("../../utils/async.util");
const { successResponse } = require("../../utils/response.util");
const env          = require("../../config/env");

const resend = new Resend(env.RESEND_API_KEY);

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  // Always return success — never reveal if email exists (security best practice)
  const SAFE_RESPONSE = successResponse(
    res, "If an account with this email exists, a reset link has been sent."
  );

  const tenant = await Tenant.findOne({ email: email.toLowerCase().trim() }).lean();
  if (!tenant) return SAFE_RESPONSE;

  const user = await User.findOne({ tenantId: tenant._id, role: "ADMIN", isActive: true })
    .select("+resetToken +resetTokenExpiry");
  if (!user) return SAFE_RESPONSE;

  // Generate raw token — send this in email
  const rawToken    = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetToken       = hashedToken;
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  try {
    await resend.emails.send({
      from:    "DairyFlow <onboarding@resend.dev>",
      to:      tenant.email,
      subject: "Reset your DairyFlow password",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="font-size:20px;font-weight:800;color:#111827;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
            Hi ${tenant.contactName},<br/><br/>
            We received a request to reset your DairyFlow password for <strong>${tenant.name}</strong>.
            Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#111827;color:#fff;text-decoration:none;
              font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;">
            Reset Password
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.
            Your password won't change until you click the link above.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
          <p style="color:#d1d5db;font-size:11px;">DairyFlow · Dairy Operations Platform</p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Log but don't expose error — user still gets safe response
    console.error("Reset email send failed:", emailErr);
    // Clear token since email failed
    user.resetToken       = null;
    user.resetTokenExpiry = null;
    await user.save();
    return res.status(500).json({ success: false, message: "Failed to send reset email. Please try again." });
  }

  return SAFE_RESPONSE;
});