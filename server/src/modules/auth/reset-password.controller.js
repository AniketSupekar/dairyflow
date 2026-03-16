/**
 * modules/auth/reset-password.controller.js
 *
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Flow:
 *   1. Hash incoming token → find user with matching hash + not expired
 *   2. Validate new password
 *   3. Set new passwordHash → pre-save hook hashes it
 *   4. Clear reset token
 */

const crypto       = require("crypto");
const User         = require("../users/user.model");
const asyncHandler = require("../../utils/async.util");
const { successResponse, errorResponse } = require("../../utils/response.util");

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return errorResponse(res, "Token and new password are required", 400);
  }
  if (password.length < 8) {
    return errorResponse(res, "Password must be at least 8 characters", 400);
  }

  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetToken:       hashedToken,
    resetTokenExpiry: { $gt: new Date() }, // not expired
  }).select("+resetToken +resetTokenExpiry");

  if (!user) {
    return errorResponse(res, "This reset link is invalid or has expired. Please request a new one.", 400);
  }

  // Set new password — pre-save hook in user.model.js hashes it
  user.passwordHash     = password;
  user.resetToken       = null;
  user.resetTokenExpiry = null;
  await user.save();

  return successResponse(res, "Password reset successfully. You can now log in with your new password.");
});