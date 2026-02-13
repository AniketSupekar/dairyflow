const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./modules/auth/auth.routes");
const deliveryRoutes = require("./modules/deliveryRecords/deliveryRecord.routes");
const paymentRoutes = require("./modules/payments/payment.routes");
const billingRoutes = require("./modules/billing/billing.routes");
const customerRoutes = require("./modules/customers/customer.routes");
const productRoutes = require("./modules/products/product.routes");
const laneRoutes = require("./modules/lanes/lane.routes");
const userRoutes = require("./modules/users/user.routes");

const authMiddleware = require("./middleware/auth.middleware");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/api/auth", authRoutes);

app.use("/api", authMiddleware);

app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/lanes", laneRoutes);
app.use("/api/users", userRoutes);

app.use(errorMiddleware);

module.exports = app;