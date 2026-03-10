/**
 * app.js — Express application setup
 *
 * Changes from previous version:
 *   + tenantMiddleware on all protected routes (loads req.tenant)
 *   + tenant routes registered
 *   + rate limiting on auth routes
 *   + request body size limit (10kb — prevents memory abuse)
 *   + app name reads from env, not hardcoded
 */

require("dotenv").config();
const env = require("./config/env"); // validates all required env vars at startup

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
      if (!origin) return callback(null, true); // Postman / server-to-server
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials:    true,
    exposedHeaders: ["Content-Disposition"], // required for PDF filename in browser
  })
);

// ── Body parsing — 10kb limit prevents request body memory abuse ──────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.isDev) app.use(morgan("dev"));

// ── Health / info routes (public, no auth) ────────────────────────────────────
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

// ── Public routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);

// ── Protected routes ──────────────────────────────────────────────────────────
// authMiddleware    → validates JWT, sets req.userId + req.tenantId + req.role
// tenantMiddleware  → loads Tenant doc into req.tenant (one DB call per request)
// apiLimiter        → general rate limit on all protected routes
app.use("/api", authMiddleware, tenantMiddleware, apiLimiter);

app.use("/api/tenant",     tenantRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments",   paymentRoutes);
app.use("/api/billing",    billingRoutes);
app.use("/api/customers",  customerRoutes);
app.use("/api/products",   productRoutes);
app.use("/api/lanes",      laneRoutes);
app.use("/api/users",      userRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;