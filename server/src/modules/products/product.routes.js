const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getInactiveProducts,
  updateProduct,
  deleteProduct,
  restoreProduct,
} = require("./product.controller");

// ── Static routes first (before /:id) ────────────────────────────────────────
router.get("/", getProducts);
router.get("/inactive", getInactiveProducts);
router.post("/", createProduct);

// ── Dynamic /:id routes ───────────────────────────────────────────────────────
router.put("/:id", updateProduct);
router.put("/:id/restore", restoreProduct);
router.delete("/:id", deleteProduct);

module.exports = router;