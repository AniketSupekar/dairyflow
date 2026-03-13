/**
 * app.js — Express application setup
 */

require("dotenv").config();
const env = require("./config/env");

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");

const authRoutes     = require("./modules/auth/auth.routes");
const deliveryRoutes = require("./modules/deliveryRecords/deliveryRecord.routes");
const paymentRoutes  = require("./modules/payments/payment.routes");
const billingRoutes  = require("./modules/billing/billing.routes");
const customerRoutes = require("./modules/customers/customer.routes");
const productRoutes  = require("./modules/products/product.routes");
const laneRoutes     = require("./modules/lanes/lane.routes");
const userRoutes     = require("./modules/users/user.routes");
const tenantRoutes   = require("./modules/tenants/tenant.routes");
const payRoutes      = require("./modules/pay/pay.routes");

const authMiddleware   = require("./middleware/auth.middleware");
const tenantMiddleware = require("./middleware/tenant.middleware");
const errorMiddleware  = require("./middleware/error.middleware");
const { authLimiter, apiLimiter } = require("./middleware/rateLimit.middleware");

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials:    true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.isDev) app.use(morgan("dev"));

// ── Health / info routes (public) ─────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    app:         "Dairy SaaS API",
    status:      "live",
    version:     "2.0.0",
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status:      "ok",
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ── Public routes (NO auth) ───────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/pay",  payRoutes);                // UPI redirect — must stay public

// ── Protected routes (auth + tenant + rate limit applied per route) ───────────
const protect = [authMiddleware, tenantMiddleware, apiLimiter];

app.use("/api/tenant",     protect, tenantRoutes);
app.use("/api/deliveries", protect, deliveryRoutes);
app.use("/api/payments",   protect, paymentRoutes);
app.use("/api/billing",    protect, billingRoutes);
app.use("/api/customers",  protect, customerRoutes);
app.use("/api/products",   protect, productRoutes);
app.use("/api/lanes",      protect, laneRoutes);
app.use("/api/users",      protect, userRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;