const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./user.controller");

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
  next();
};

router.use(authMiddleware);
router.use(adminOnly);

// ── Static routes first (before any /:id) ──────────────────
router.post("/", controller.createDeliveryBoy);
router.get("/", controller.getDeliveryBoys);
router.get("/inactive", controller.getInactiveDeliveryBoys);

// ── Dynamic /:id routes ────────────────────────────────────
router.put("/:id", controller.updateDeliveryBoy);
router.put("/:id/assign-lanes", controller.assignLanes);
router.put("/:id/deactivate", controller.deactivateDeliveryBoy);
router.put("/:id/restore", controller.restoreDeliveryBoy);

module.exports = router;