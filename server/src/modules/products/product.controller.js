const Product = require("./product.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");

exports.createProduct = async (req, res, next) => {
  try {
    const { name, unit, rate } = req.body;

    const product = await Product.create({
      tenantId: req.user.tenantId,
      name,
      unit,
      rate,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Product name already exists" });
    }
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ tenantId: req.user.tenantId, isActive: true }).lean();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

exports.getInactiveProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ tenantId: req.user.tenantId, isActive: false })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Product name already exists" });
    }
    next(error);
  }
};

// Soft delete — blocked if product has any delivery records
exports.deleteProduct = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const productId = req.params.id;

    const product = await Product.findOne({ _id: productId, tenantId });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const deliveryExists = await DeliveryRecord.exists({ tenantId, productId });
    if (deliveryExists) {
      return res.status(400).json({ success: false, message: "Cannot deactivate product used in deliveries" });
    }

    product.isActive = false;
    await product.save();

    res.json({ success: true, message: "Product deactivated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.restoreProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { isActive: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product restored successfully", data: product });
  } catch (error) {
    next(error);
  }
};