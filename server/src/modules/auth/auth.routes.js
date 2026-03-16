const express  = require("express");
const router   = express.Router();
const { login }          = require("./auth.controller");
const { register }       = require("./register.controller");
const { forgotPassword } = require("./forgot-password.controller");
const { resetPassword }  = require("./reset-password.controller");
const { authLimiter }    = require("../../middleware/rateLimit.middleware");

router.post("/login",           authLimiter, login);
router.post("/register",        authLimiter, register);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password",  authLimiter, resetPassword);

module.exports = router;