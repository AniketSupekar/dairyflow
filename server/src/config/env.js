/**
 * config/env.js
 *
 * Single source of truth for all environment variables.
 * Validates required vars at startup — app crashes immediately with a clear
 * error instead of silently failing at runtime in production.
 *
 * Usage: const env = require('./config/env')
 * Require at the very top of server.js before anything else.
 */

const required = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n❌  Missing required environment variables:");
  missing.forEach((key) => console.error(`   • ${key}`));
  console.error("\n   Add them to your .env file or deployment dashboard.\n");
  process.exit(1);
}

module.exports = {
  NODE_ENV:   process.env.NODE_ENV || "development",
  PORT:       parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI:  process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY:    process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },

  isProd: process.env.NODE_ENV === "production",
  isDev:  process.env.NODE_ENV !== "production",
};