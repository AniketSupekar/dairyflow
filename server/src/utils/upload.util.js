/**
 * utils/upload.util.js
 *
 * Cloudinary upload utilities.
 * Uses buffer → stream approach (multer memoryStorage) — no temp files
 * on disk. Critical for Railway/serverless where ephemeral filesystem
 * can't be relied on.
 */

const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer       - file buffer from multer memoryStorage
 * @param {object} options      - cloudinary upload_stream options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        ...options,
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });

/**
 * Delete a file from Cloudinary by its public_id.
 * Non-throwing — logo cleanup failure should never block the main operation.
 * @param {string} publicId
 */
const deleteFile = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn(`[Cloudinary] Could not delete ${publicId}:`, err.message);
  }
};

module.exports = { uploadBuffer, deleteFile };