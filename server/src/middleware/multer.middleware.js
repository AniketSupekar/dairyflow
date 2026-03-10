/**
 * middleware/multer.middleware.js
 *
 * Multer configuration for logo uploads.
 * memoryStorage: buffer goes straight to Cloudinary — no temp files on disk.
 *
 * Requires: npm install multer
 */

const multer = require("multer");

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB   = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });

/**
 * Wraps multer in a promise so errors propagate cleanly through asyncHandler.
 * Use as: await handleLogoUpload(req, res)
 */
const handleLogoUpload = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single("logo")(req, res, (err) => {
      if (!err) return resolve();
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return reject(new Error(`Logo must be smaller than ${MAX_SIZE_MB}MB.`));
      }
      reject(err);
    });
  });

module.exports = { handleLogoUpload };