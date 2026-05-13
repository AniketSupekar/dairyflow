# DairyFlow : Backend

Express.js REST API serving the DairyFlow multi-tenant SaaS platform.

---

## Prerequisites

- Node.js v18+
- npm v9+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Resend account (free tier — 3000 emails/month)

---

## Local Setup

```bash
# 1. Navigate to server directory
cd server

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Fill in all values in .env (see Environment Variables section below)

# 4. Start development server
npm run dev
# Server runs on http://localhost:5000
```

---

## Environment Variables

Create `server/.env` with these values:

```env
# ── App ──────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ─────────────────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/dairyflow

# ── Auth ─────────────────────────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# ── Cloudinary (logo uploads) ─────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Resend (password reset emails) ───────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# ── Frontend URL (used in reset email links) ─────────────────────────
CLIENT_URL=http://localhost:5173
```

**Production (Vercel/Railway):** Add all the above in your deployment dashboard environment variables. Change `NODE_ENV=production` and `CLIENT_URL` to your live frontend URL.

---

## Available Scripts

```bash
npm run dev      # Start with nodemon (auto-restart on file change)
npm start        # Start production server
```

---

## API Overview

All protected routes require `Authorization: Bearer <JWT>` header.

### Public Routes (no auth)
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/pay              ← UPI redirect (customers tap from WhatsApp)
GET  /                     ← Health check
GET  /health               ← Health check
```

### Protected Routes (JWT required)
```
# Tenant
GET    /api/tenant/settings
PATCH  /api/tenant/settings
POST   /api/tenant/logo
DELETE /api/tenant/logo

# Customers
GET    /api/customers
POST   /api/customers
PATCH  /api/customers/:id
DELETE /api/customers/:id

# Lanes
GET    /api/lanes
POST   /api/lanes
PATCH  /api/lanes/:id
DELETE /api/lanes/:id

# Products
GET    /api/products
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

# Deliveries
GET    /api/deliveries
POST   /api/deliveries/upsert
PATCH  /api/deliveries/:id
DELETE /api/deliveries/:id
GET    /api/deliveries/daily-summary

# Billing
POST   /api/billing/generate
GET    /api/billing/customer/:customerId
GET    /api/billing/:id/pdf
GET    /api/billing/dashboard-stats
GET    /api/billing/outstanding
GET    /api/billing/customer-summary/:customerId
GET    /api/billing/analytics
POST   /api/billing/bulk-generate
POST   /api/billing/bulk-download

# Payments
GET    /api/payments
POST   /api/payments
DELETE /api/payments/:id

# Users (delivery boys)
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

---

## Middleware Stack (protected routes)

Every protected request goes through this chain in order:

```
Request
  → authMiddleware        (validate JWT, set req.userId, req.tenantId, req.role)
  → tenantMiddleware      (load Tenant doc into req.tenant — 1 DB call)
  → apiLimiter            (rate limit: 100 req/15min per IP)
  → subscriptionMiddleware (block mutations if trial expired)
  → route handler
```

---

## Key Architecture Decisions

- **Tenant isolation:** Every DB query filters by `tenantId` — data never leaks between tenants
- **Role split:** ADMIN has full access; USER (delivery boy) can only touch their assigned lanes and only today's deliveries
- **Subscription gating:** Expired tenants get read-only access (GETs pass, mutations return `403 SUBSCRIPTION_EXPIRED`) — never hard-block, always allow data viewing
- **UPI links:** Public `/api/pay` redirect converts HTTPS links (tappable in WhatsApp) to `upi://` deep links (opens PhonePe/GPay)
- **Atomic registration:** Tenant + User created in a single MongoDB transaction — if either fails, both roll back

---

## Module Structure

Each feature module follows this pattern:
```
modules/
  featureName/
    feature.model.js       ← Mongoose schema
    feature.controller.js  ← Business logic
    feature.routes.js      ← Express router
```

---

## Error Response Format

All errors follow this shape:
```json
{
  "success": false,
  "message": "Human readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Special codes:
- `SUBSCRIPTION_EXPIRED` → Frontend shows upgrade modal
- Standard HTTP status codes used throughout (400, 401, 403, 404, 409, 500)
