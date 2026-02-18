const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./customer.controller");

router.use(authMiddleware);

// 🔹 Create customer → admin only
router.post("/", (req, res, next) => {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
  next();
}, controller.createCustomer);

// 🔹 Get customers by lane → admin + user
router.get("/lane/:laneId", async (req, res, next) => {
  const { role, assignedLanes } = req.user;
  const { laneId } = req.params;

  if (role?.toLowerCase() === "admin") {
    return controller.getCustomersByLane(req, res);
  }

  if (role?.toLowerCase() === "user") {
    const allowed = assignedLanes?.some(
      (id) => id.toString() === laneId.toString()
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to access this lane",
      });
    }

    return controller.getCustomersByLane(req, res);
  }

  return res.status(403).json({
    success: false,
    message: "Access denied",
  });
});

// 🔹 Update customer → admin only
router.put("/:id", (req, res, next) => {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
  next();
}, controller.updateCustomer);

// 🔹 Delete customer → admin only
router.delete("/:id", (req, res, next) => {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
  next();
}, controller.deleteCustomer);

module.exports = router;
