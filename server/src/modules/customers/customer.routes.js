const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/auth.middleware");
const controller = require("./customer.controller");

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

router.post("/", controller.createCustomer);
router.get("/lane/:laneId", controller.getCustomersByLane);
router.put("/:id", controller.updateCustomer);
router.delete("/:id", controller.deleteCustomer);

module.exports = router;