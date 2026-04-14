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
const deliveryDefaultsRoutes = require("./modules/deliveryDefaults/deliveryDefaults.routes");

const authMiddleware         = require("./middleware/auth.middleware");
const tenantMiddleware       = require("./middleware/tenant.middleware");
const subscriptionMiddleware = require("./middleware/subscription.middleware");
const errorMiddleware        = require("./middleware/error.middleware");
const { authLimiter, apiLimiter } = require("./middleware/rateLimit.middleware");

const app = express();

// ── Trust proxy — required for Vercel/Railway deployments ────────────────────
// Vercel sits behind a proxy and sends X-Forwarded-For headers.
// Without this, express-rate-limit throws ValidationError and crashes requests.
app.set("trust proxy", 1);

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

// ── Protected routes ──────────────────────────────────────────────────────────
// Order matters:
//   1. authMiddleware       → validates JWT, sets req.userId + req.tenantId + req.role
//   2. tenantMiddleware     → loads Tenant doc into req.tenant (one DB call per request)
//   3. apiLimiter           → rate limit
//   4. subscriptionMiddleware → blocks mutations if trial/plan expired (read-only mode)
const protect = [authMiddleware, tenantMiddleware, apiLimiter, subscriptionMiddleware];

app.use("/api/tenant",     protect, tenantRoutes);
app.use("/api/delivery-defaults", protect, deliveryDefaultsRoutes); 
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