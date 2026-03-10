/**
 * config/cloudinary.js
 *
 * Initializes Cloudinary SDK once at startup.
 * All upload utilities import from here — single source of config,
 * no scattered cloudinary.config() calls across the codebase.
 */

const cloudinary = require("cloudinary").v2;
const { CLOUDINARY } = require("./env");

cloudinary.config({
  cloud_name: CLOUDINARY.CLOUD_NAME,
  api_key:    CLOUDINARY.API_KEY,
  api_secret: CLOUDINARY.API_SECRET,
  secure:     true, // always https URLs
});

module.exports = cloudinary;