const express = require("express");
const router = express.Router();
const {
  createLane,
  getLanes,
  getInactiveLanes,
  updateLane,
  deleteLane,
  restoreLane,
} = require("./lane.controller");

// Auth + admin check is handled by app.js (authMiddleware on /api)
// and each route file can add role checks as needed.
// Lanes are admin-only — enforced via adminOnly in app-level or here if needed.

// ── Static routes first (before /:id) ────────────────────────────────────────
router.get("/", getLanes);
router.get("/inactive", getInactiveLanes);
router.post("/", createLane);

// ── Dynamic /:id routes ───────────────────────────────────────────────────────
router.put("/:id", updateLane);
router.put("/:id/restore", restoreLane);
router.delete("/:id", deleteLane);

module.exports = router;