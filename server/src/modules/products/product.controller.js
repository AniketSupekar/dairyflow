const Product = require("./product.model");

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
      { new: true }
    );

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Soft Delete Product
exports.deleteProduct = async (req, res, next) => {
  try {
    await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.user.tenantId,
      },
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