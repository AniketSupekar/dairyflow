/**
 * middleware/rateLimit.middleware.js
 *
 * Rate limiting presets. Applied per-route, not globally,
 * so normal API usage is never affected.
 *
 * Vercel/Railway note:
 *   app.set("trust proxy", 1) in app.js handles X-Forwarded-For trust.
 *   validate.xForwardedForHeader: false silences the secondary warning
 *   about the Forwarded header which Vercel also sends.
 */

const rateLimit = require("express-rate-limit");

const createLimiter = ({ windowMinutes, max, message }) =>
  rateLimit({
    windowMs:               windowMinutes * 60 * 1000,
    max,
    standardHeaders:        true,
    legacyHeaders:          false,
    message:                { success: false, message },
    skipSuccessfulRequests: false,
    validate:               { xForwardedForHeader: false }, // silence Vercel proxy warning
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