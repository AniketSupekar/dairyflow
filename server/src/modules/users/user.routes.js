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

// Create delivery boy
router.post("/", controller.createDeliveryBoy);

// Get delivery boys
router.get("/", controller.getDeliveryBoys);

// Assign lanes
router.put("/:id/assign-lanes", controller.assignLanes);

// Deactivate delivery boy
router.put("/:id/deactivate", controller.deactivateDeliveryBoy);

module.exports = router;