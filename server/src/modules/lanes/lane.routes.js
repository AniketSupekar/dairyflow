const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const {
  createLane,
  getLanes,
  updateLane,
  deleteLane,
} = require("./lane.controller");

/**
 * Role check inline (since you don't have role middleware yet)
 */
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

router.post("/", createLane);
router.get("/", getLanes);
router.put("/:id", updateLane);
router.delete("/:id", deleteLane);

module.exports = router;