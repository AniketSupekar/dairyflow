/**
 * utils/async.util.js
 *
 * Wraps async route handlers — any thrown error is automatically
 * forwarded to Express error middleware. Eliminates try/catch in every controller.
 *
 * Before:
 *   exports.get = async (req, res, next) => {
 *     try { ... } catch(err) { next(err) }
 *   }
 *
 * After:
 *   exports.get = asyncHandler(async (req, res) => { ... })
 */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;