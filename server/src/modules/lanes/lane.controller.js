const Lane = require("./lane.model");
const Customer = require("../customers/customer.model");

exports.createLane = async (req, res) => {
  try {
    const { name, description } = req.body;

    const lane = await Lane.create({
      tenantId: req.user.tenantId,
      name: name.trim(),
      description,
    });

    res.status(201).json({ success: true, message: "Lane created successfully", data: lane });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Lane name already exists" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getLanes = async (req, res) => {
  try {
    const lanes = await Lane.find({ tenantId: req.user.tenantId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: lanes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInactiveLanes = async (req, res) => {
  try {
    const lanes = await Lane.find({ tenantId: req.user.tenantId, isActive: false })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: lanes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLane = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const lane = await Lane.findOneAndUpdate(
      { _id: id, tenantId: req.user.tenantId },
      { name: name?.trim(), description },
      { returnDocument: "after", runValidators: true }
    );

    if (!lane) {
      return res.status(404).json({ success: false, message: "Lane not found" });
    }

    return res.json({ success: true, message: "Lane updated successfully", data: lane });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Lane name already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete — blocked if any customers (active or inactive) exist in this lane
exports.deleteLane = async (req, res) => {
  try {
    const { id } = req.params;

    const lane = await Lane.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!lane) {
      return res.status(404).json({ success: false, message: "Lane not found" });
    }

    const customerExists = await Customer.exists({ tenantId: req.user.tenantId, laneId: id });
    if (customerExists) {
      return res.status(400).json({ success: false, message: "Cannot deactivate lane with existing customers" });
    }

    lane.isActive = false;
    await lane.save();

    res.json({ success: true, message: "Lane deactivated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.restoreLane = async (req, res) => {
  try {
    const { id } = req.params;

    const lane = await Lane.findOneAndUpdate(
      { _id: id, tenantId: req.user.tenantId },
      { isActive: true },
      { new: true }
    );

    if (!lane) {
      return res.status(404).json({ success: false, message: "Lane not found" });
    }

    res.json({ success: true, message: "Lane restored successfully", data: lane });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};