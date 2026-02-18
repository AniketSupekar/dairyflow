const Customer = require("./customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Bill = require("../billing/bill.model");

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

    // 🔥 Phone must be unique per tenant
    const existingCustomer = await Customer.findOne({
      tenantId,
      phone,
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this phone already exists",
      });
    }

    const customer = await Customer.create({
      tenantId,
      name,
      phone,
      address,
      laneId,
      subscriptions,
      openingBalance: openingBalance || 0,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
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
      message: "Server error",
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
    const { phone } = req.body;

    // 🔥 If phone is being updated → validate uniqueness
    if (phone) {
      const existingCustomer = await Customer.findOne({
        tenantId,
        phone,
        _id: { $ne: id },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone already exists",
        });
      }
    }

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
    res.status(500).json({
      success: false,
      message: "Server error",
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

    const customer = await Customer.findOne({ _id: id, tenantId });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // 🔥 Only block if unpaid bills exist
    const unpaidBillExists = await Bill.exists({
      tenantId,
      customerId: id,
      status: { $in: ["UNPAID", "PARTIAL"] },
    });

    if (unpaidBillExists) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate customer with unpaid bills",
      });
    }

    // ✅ We ALLOW deactivation even if delivery history exists
    customer.isActive = false;
    await customer.save();

    res.json({
      success: true,
      message: "Customer deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};