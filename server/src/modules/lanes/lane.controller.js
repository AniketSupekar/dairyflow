const Lane = require("./lane.model");

/**
 * Create Lane
 */
exports.createLane = async (req, res) => {
  try {
    const { name, description } = req.body;

    const lane = await Lane.create({
      tenantId: req.user.tenantId,
      name: name.trim(),
      description,
    });

    res.status(201).json({
      success: true,
      message: "Lane created successfully",
      data: lane,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Active Lanes
 */
exports.getLanes = async (req, res) => {
  try {
    const lanes = await Lane.find({
      tenantId: req.user.tenantId,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: lanes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Lane
 */
exports.updateLane = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const lane = await Lane.findOneAndUpdate(
      {
        _id: id,
        tenantId: req.user.tenantId,
      },
      { name, description },
      { new: true }
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Lane name already exists",
      });
    }

    if (!lane) {
      return res.status(404).json({
        success: false,
        message: "Lane not found",
      });
    }

    res.json({
      success: true,
      message: "Lane updated successfully",
      data: lane,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Soft Delete Lane
 */
exports.deleteLane = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if lane exists
    const lane = await Lane.findOne({
      _id: id,
      tenantId: req.user.tenantId,
    });

    if (!lane) {
      return res.status(404).json({
        success: false,
        message: "Lane not found",
      });
    }

    // Check if customers exist in this lane
    const customerExists = await Customer.exists({
      tenantId: req.user.tenantId,
      laneId: id,
    });

    if (customerExists) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete lane with existing customers",
      });
    }

    lane.isActive = false;
    await lane.save();

    res.json({
      success: true,
      message: "Lane deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};