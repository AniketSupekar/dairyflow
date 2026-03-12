/**
 * modules/tenants/tenant.controller.js
 *
 * GET    /api/tenant/settings  → fetch own profile (used by TenantContext on load)
 * PATCH  /api/tenant/settings  → update name, phone, address, invoicePrefix, upiId
 * POST   /api/tenant/logo      → upload / replace logo
 * DELETE /api/tenant/logo      → remove logo (revert to app default)
 */

const Tenant          = require("./tenant.model");
const asyncHandler    = require("../../utils/async.util");
const { successResponse, errorResponse } = require("../../utils/response.util");
const { uploadBuffer, deleteFile }       = require("../../utils/upload.util");
const { handleLogoUpload }               = require("../../middleware/multer.middleware");

// Fields the tenant is allowed to self-update (whitelist pattern)
const UPDATABLE_FIELDS = ["name", "contactName", "phone", "address", "invoicePrefix", "upiId"];

// ─── GET /api/tenant/settings ─────────────────────────────────────────────────
exports.getSettings = asyncHandler(async (req, res) => {
  // req.tenant is already loaded by tenantMiddleware — no DB call needed here
  const t = req.tenant;

  return successResponse(res, "Settings fetched successfully", {
    id:            t._id,
    businessName:  t.name,
    ownerName:     t.contactName,
    phone:         t.phone,
    email:         t.email,
    address:       t.address       || "",
    logoUrl:       t.logoUrl       || "",
    invoicePrefix: t.invoicePrefix || "INV",
    upiId:         t.upiId         || "",
    plan:          t.plan,
    trialEndsAt:   t.trialEndsAt,
    isTrialActive: new Date() < new Date(t.trialEndsAt),
    createdAt:     t.createdAt,
  });
});

// ─── PATCH /api/tenant/settings ───────────────────────────────────────────────
exports.updateSettings = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;

  // Extract only whitelisted fields — silently ignore anything else in body
  const updates = {};
  UPDATABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== null) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return errorResponse(res, "No valid fields provided to update", 400);
  }

  // If phone is changing, check it isn't taken by another tenant
  if (updates.phone) {
    const conflict = await Tenant.findOne({
      phone: updates.phone,
      _id:   { $ne: tenantId },
    }).lean();
    if (conflict) {
      return errorResponse(res, "This phone number is already registered to another account", 409);
    }
  }

  const updated = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) return errorResponse(res, "Tenant not found", 404);

  return successResponse(res, "Settings updated successfully", {
    businessName:  updated.name,
    ownerName:     updated.contactName,
    phone:         updated.phone,
    address:       updated.address,
    invoicePrefix: updated.invoicePrefix,
    upiId:         updated.upiId || "",
  });
});

// ─── POST /api/tenant/logo ────────────────────────────────────────────────────
exports.uploadLogo = asyncHandler(async (req, res) => {
  // Parse multipart — must happen before accessing req.file
  await handleLogoUpload(req, res);

  if (!req.file) {
    return errorResponse(res, "No file provided. Send logo as multipart/form-data field 'logo'", 400);
  }

  const tenantId = req.tenantId;
  const tenant   = await Tenant.findById(tenantId).lean();
  if (!tenant) return errorResponse(res, "Tenant not found", 404);

  // Upload to Cloudinary — overwrite: true + fixed public_id means
  // replacing logo never creates orphaned files in Cloudinary
  const { url, publicId } = await uploadBuffer(req.file.buffer, {
    folder:      `dairy_saas/logos/${tenantId}`,
    public_id:   "logo",       // always the same name → clean overwrite
    overwrite:   true,
    invalidate:  true,         // bust Cloudinary CDN cache immediately
    transformation: [
      { width: 400, height: 400, crop: "limit" }, // preserve aspect, cap at 400px
      { quality: "auto:best" },
      { fetch_format: "auto" },
    ],
  });

  // If old logo had a different publicId (edge case), clean it up
  if (tenant.logoPublicId && tenant.logoPublicId !== publicId) {
    await deleteFile(tenant.logoPublicId);
  }

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { logoUrl: url, logoPublicId: publicId },
  });

  return successResponse(res, "Logo uploaded successfully", { logoUrl: url });
});

// ─── DELETE /api/tenant/logo ──────────────────────────────────────────────────
exports.deleteLogo = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const tenant   = await Tenant.findById(tenantId).lean();
  if (!tenant) return errorResponse(res, "Tenant not found", 404);

  if (!tenant.logoPublicId) {
    return errorResponse(res, "No custom logo to remove", 400);
  }

  await deleteFile(tenant.logoPublicId);

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { logoUrl: "", logoPublicId: "" },
  });

  return successResponse(res, "Logo removed. App default logo will be used.");
});