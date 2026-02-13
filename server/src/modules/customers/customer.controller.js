const Customer = require("./customer.model");

/**
 * Create Customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const {
      name,
      phone,
      address,
      laneId,
      subscriptions,
      openingBalance,
    } = req.body;

    const customer = await Customer.create({
      tenantId,
      name,
      phone,
      address,
      laneId,
      subscriptions,
      openingBalance,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Customers By Lane
 */
exports.getCustomersByLane = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId } = req.params;

    const customers = await Customer.find({
      tenantId,
      laneId,
      isActive: true,
    })
      .populate("subscriptions.productId", "name rate")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Soft Delete Customer
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: "Customer deactivated",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
