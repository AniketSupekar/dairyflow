/**
 * middleware/rateLimit.middleware.js
 *
 * Rate limiting presets. Applied per-route, not globally,
 * so normal API usage is never affected.
 *
 * Requires: npm install express-rate-limit
 */

const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMinutes, max, message }) =>
  rateLimit({
    windowMs:               windowMinutes * 60 * 1000,
    max,
    standardHeaders:        true,  // RateLimit-* headers
    legacyHeaders:          false,
    message:                { success: false, message },
    skipSuccessfulRequests: false,
  });

// Auth — strict. Prevents brute force on login/register.
const authLimiter = createLimiter({
  windowMinutes: 15,
  max:           10,
  message:       "Too many attempts. Please try again in 15 minutes.",
});

// File uploads — prevents Cloudinary storage abuse.
const uploadLimiter = createLimiter({
  windowMinutes: 60,
  max:           15,
  message:       "Upload limit reached. Please try again later.",
});

// General API — generous enough for real use, blocks scrapers.
const apiLimiter = createLimiter({
  windowMinutes: 15,
  max:           300,
  message:       "Too many requests. Please slow down.",
});

module.exports = { authLimiter, uploadLimiter, apiLimiter };