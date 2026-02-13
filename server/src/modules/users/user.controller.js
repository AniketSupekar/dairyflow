const User = require("./user.model");
const bcrypt = require("bcryptjs");

/*
========================================
ADMIN: Create Delivery Boy
========================================
*/
exports.createDeliveryBoy = async (req, res) => {
    try {
        const { name, phone, password, assignedLanes = [] } = req.body;

        console.log("BODY:", req.body);

        const existing = await User.findOne({
            phone,
            tenantId: req.user.tenantId,
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        const user = await User.create({
            tenantId: req.user.tenantId,
            name,
            phone,
            passwordHash: password,
            role: "USER", // must match schema enum exactly
            assignedLanes, // array of lane IDs
        });

        res.status(201).json({
            success: true,
            message: "Delivery boy created",
            data: user,
        });
    } catch (error) {
        console.error("CREATE DELIVERY BOY ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*
========================================
ADMIN: Get All Delivery Boys
========================================
*/
exports.getDeliveryBoys = async (req, res) => {
    try {
        const deliveryBoys = await User.find({
            tenantId: req.user.tenantId,
            role: "USER",
            isActive: true, // only active users
        })
            .select("-passwordHash")
            .populate("assignedLanes", "name");

        res.json({
            success: true,
            data: deliveryBoys,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*
========================================
ADMIN: Assign Lanes
========================================
*/
exports.assignLanes = async (req, res) => {
    try {
        const { lanes } = req.body;

        const user = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: "USER",
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Delivery boy not found",
            });
        }

        user.assignedLanes = lanes;
        await user.save();

        res.json({
            success: true,
            message: "Lanes assigned successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*
========================================
ADMIN: Deactivate Delivery Boy
========================================
*/
exports.deactivateDeliveryBoy = async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.params.id,
            tenantId: req.user.tenantId,
            role: "USER",
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Delivery boy not found",
            });
        }

        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: "Delivery boy deactivated",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};