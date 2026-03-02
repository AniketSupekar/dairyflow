const Customer = require("./customer.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");
const Bill = require("../billing/bill.model");

exports.createCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { name, phone, address, laneId, subscriptions, openingBalance } = req.body;

    const existingCustomer = await Customer.findOne({ tenantId, phone }).lean();
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: "Customer with this phone already exists" });
    }

    const customer = await Customer.create({
      tenantId, name, phone, address, laneId, subscriptions,
      openingBalance: openingBalance || 0,
    });

    res.status(201).json({ success: true, message: "Customer created successfully", data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCustomersByLane = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId } = req.params;

    const customers = await Customer.find({ tenantId, laneId, isActive: true })
      .populate("subscriptions.productId", "name rate")
      .sort({ name: 1 })
      .lean(); // ✅ read-only list

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { phone } = req.body;

    if (phone) {
      const existingCustomer = await Customer.findOne({
        tenantId, phone, _id: { $ne: id },
      }).lean();
      if (existingCustomer) {
        return res.status(400).json({ success: false, message: "Customer with this phone already exists" });
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, message: "Customer updated successfully", data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const customer = await Customer.findOne({ _id: id, tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const unpaidBillExists = await Bill.exists({
      tenantId,
      customerId: id,
      status: { $in: ["UNPAID", "PARTIAL"] },
    });

    if (unpaidBillExists) {
      return res.status(400).json({ success: false, message: "Cannot deactivate customer with unpaid bills" });
    }

    customer.isActive = false;
    await customer.save();

    res.json({ success: true, message: "Customer deactivated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { tenantId, isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("laneId", "name")
        .lean(), // ✅ read-only list
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.restoreCustomer = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: true },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, message: "Customer restored successfully", data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getInactiveCustomers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { laneId } = req.query;

    const filter = { tenantId, isActive: false };
    if (laneId) filter.laneId = laneId;

    const customers = await Customer.find(filter)
      .sort({ name: 1 })
      .populate("laneId", "name")
      .populate("subscriptions.productId", "name")
      .lean(); // ✅ read-only list

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};