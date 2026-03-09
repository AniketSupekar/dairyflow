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

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allows your frontend URLs — localhost in dev, Vercel URL in prod
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL,   // Set this in Vercel env vars → your frontend Vercel URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / server-to-server requests (no origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(express.json());

// ── Logging (dev only) ────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ── Root route — confirms the API is live ─────────────────────────────────────
// Open your Vercel backend URL in browser → you'll see this instead of "Cannot GET /"
app.get("/", (req, res) => {
  res.status(200).json({
    app: "Siddhivinayak Dairy API",
    status: "live",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ── Health check — for CI/CD and uptime monitors ──────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ── Public routes (no auth needed) ───────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ── Protected routes (JWT required) ──────────────────────────────────────────
app.use("/api", authMiddleware);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/lanes", laneRoutes);
app.use("/api/users", userRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;