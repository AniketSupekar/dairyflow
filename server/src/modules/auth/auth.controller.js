const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const { successResponse, errorResponse } = require("../../utils/response.util");

exports.login = async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone });
  if (!user) return errorResponse(res, "Invalid credentials", 400);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return errorResponse(res, "Invalid credentials", 400);

  const token = jwt.sign(
    { userId: user._id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return successResponse(res, "Login successful", { token });
};