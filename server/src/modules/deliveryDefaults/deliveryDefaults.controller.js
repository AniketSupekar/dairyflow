/**
 * modules/deliveryDefaults/deliveryDefaults.controller.js
 *
 * POST /api/delivery-defaults/generate
 * Body: { laneId, date }
 *
 * Called by DeliveryPage on load — silently generates today's delivery
 * records for all customers in a lane from their subscriptions.
 *
 * Idempotent — safe to call multiple times. If a record already exists
 * for a customer+product+date it is skipped (no overwrite).
 *
 * Returns: { generated, skipped, total }
 */

const Customer       = require("../customers/customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Product        = require("../products/product.model");
const asyncHandler   = require("../../utils/async.util");
const { successResponse, errorResponse } = require("../../utils/response.util");

exports.generateDefaults = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const { laneId, date } = req.body;

  if (!laneId || !date)
    return errorResponse(res, "laneId and date required", 400);

  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  // Cannot generate for future dates beyond tomorrow
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (targetDate > tomorrow)
    return errorResponse(res, "Cannot generate records for future dates", 400);

  // Fetch all active customers in this lane with their subscriptions
  const customers = await Customer.find({
    tenantId, laneId, isActive: true,
  }).lean();

  if (!customers.length)
    return successResponse(res, "No customers in lane", { generated: 0, skipped: 0, total: 0 });

  // Fetch all existing records for this lane+date in one query
  const existingRecords = await DeliveryRecord.find({
    tenantId, laneId, date: targetDate, isActive: true,
  }).lean();

  // Build a set of "customerId_productId" keys that already exist
  const existingKeys = new Set(
    existingRecords.map((r) => `${r.customerId}_${r.productId}`)
  );

  // Collect all unique productIds from subscriptions to fetch rates
  const allProductIds = [
    ...new Set(
      customers.flatMap((c) => c.subscriptions.map((s) => s.productId.toString()))
    ),
  ];

  const products = await Product.find({
    _id: { $in: allProductIds }, tenantId, isActive: true,
  }).lean();

  const productRateMap = Object.fromEntries(
    products.map((p) => [p._id.toString(), p.rate])
  );

  // Build records to insert
  const toInsert = [];

  for (const customer of customers) {
    if (!customer.subscriptions?.length) continue;

    for (const sub of customer.subscriptions) {
      const key = `${customer._id}_${sub.productId}`;
      if (existingKeys.has(key)) continue; // already exists — skip

      const rate = productRateMap[sub.productId.toString()];
      if (!rate) continue; // product inactive or not found — skip

      toInsert.push({
        tenantId,
        laneId,
        customerId: customer._id,
        productId:  sub.productId,
        quantity:   sub.quantity,
        rate,
        status:     "DELIVERED",
        date:       targetDate,
        isActive:   true,
      });
    }
  }

  let generated = 0;
  const skipped = existingRecords.length;

  if (toInsert.length > 0) {
    // insertMany with ordered:false — continues even if some fail
    // (shouldn't happen due to our key check above, but safe)
    try {
      const result = await DeliveryRecord.insertMany(toInsert, { ordered: false });
      generated = result.length;
    } catch (err) {
      // Handle rare duplicate key errors gracefully
      if (err.writeErrors) {
        generated = toInsert.length - err.writeErrors.length;
      } else {
        throw err;
      }
    }
  }

  return successResponse(res, "Defaults generated", {
    generated,
    skipped,
    total: generated + skipped,
  });
});