const Product = require("./product.model");
const DeliveryRecord = require("../deliveryRecords/deliveryRecord.model");

// Create Product
exports.createProduct = async (req, res, next) => {
  try {
    const { name, unit, rate } = req.body;

    const product = await Product.create({
      tenantId: req.user.tenantId,
      name,
      unit,
      rate,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product name already exists",
      });
    }

    next(error);
  }
};

// Get All Products
exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      tenantId: req.user.tenantId,
      isActive: true,
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Update Product
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.user.tenantId,
      },
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product name already exists",
      });
    }

    next(error);
  }
};

// Soft Delete Product
exports.deleteProduct = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const productId = req.params.id;

    const deliveryExists = await DeliveryRecord.exists({
      tenantId,
      productId,
    });

    if (deliveryExists) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product used in deliveries",
      });
    }

    await Product.findOneAndUpdate(
      { _id: productId, tenantId },
      { isActive: false }
    );

    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    next(error);
  }
};