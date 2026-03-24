# DairyFlow 

> **Dairy Operations Platform** - A multi-tenant SaaS application that digitizes the complete workflow of small to medium dairy businesses in India.

## Problem Statement

Dairy owners in India manage 50–500 customers across multiple delivery routes. Every day involves:
- Tracking who got milk and how much
- Collecting cash from customers
- Generating monthly bills
- Chasing unpaid dues
- Coordinating with delivery staff

All of this is done manually — paper notebooks, WhatsApp forwards, phone calls, memory. **DairyFlow replaces this entire workflow digitally.**

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Multi-tenant** | Each dairy is an isolated tenant with their own data |
| **Lane Management** | Customers grouped by delivery routes (lanes) |
| **Daily Deliveries** | Delivery boys mark delivered/not-delivered/holiday per customer |
| **Billing** | Generate PDF bills for any date range per customer |
| **Payments** | Record cash/UPI/bank payments against bills |
| **Outstanding Tracker** | See all unpaid bills with urgency indicators |
| **WhatsApp Billing** | Send bills directly via WhatsApp with one tap |
| **WhatsApp Blast** | Send bills to all customers in a lane at once |
| **UPI Payment Links** | Customers tap a link in WhatsApp → GPay/PhonePe opens with amount pre-filled |
| **Analytics** | Revenue trends, collection rates, payment mode breakdown |
| **Delivery Boy App** | Role-split PWA for delivery staff — only sees their assigned lanes |
| **Live Dashboard** | Real-time delivery progress per lane, auto-refreshes every 30s |
| **Subscription Gating** | Free 30-day trial → read-only on expiry → upgrade to continue |

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| HTTP Client | Axios |
| PDF Rendering | Browser-native |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| File Upload | Multer + Cloudinary |
| Email | Resend |
| PDF Generation | PDFKit |
| Rate Limiting | express-rate-limit |
| Security | Helmet, CORS |
| Hosting | Vercel (serverless) |

### External Services
| Service | Purpose | Cost |
|---------|---------|------|
| MongoDB Atlas | Database | Free tier |
| Cloudinary | Logo storage | Free tier |
| Resend | Password reset emails | Free (3k/month) |
| Vercel | Frontend + Backend hosting | Free tier |
| WhatsApp wa.me | Bill sharing | Free |

---

## Repository Structure

```
dairy_app/
├── client/                  # React frontend
│   ├── src/
│   │   ├── api/             # Axios API call functions
│   │   ├── app/             # Router + route guards
│   │   ├── components/      # Shared components
│   │   ├── context/         # AuthContext, TenantContext
│   │   ├── features/        # Page components by feature
│   │   ├── hooks/           # Custom hooks (useTenant, useToast)
│   │   ├── layouts/         # AdminLayout, UserLayout
│   │   └── utils/           # whatsapp.util.js
│   ├── public/
│   │   └── pay.html         # Public UPI payment redirect page
│   └── vercel.json          # Vercel rewrite rules
│
└── server/                  # Express backend
    └── src/
        ├── config/          # env.js, plans.config.js, db.js, cloudinary.js
        ├── middleware/       # auth, tenant, subscription, rateLimit, error
        ├── modules/         # Feature modules (each has model/controller/routes)
        │   ├── auth/        # login, register, forgot/reset password
        │   ├── billing/     # bills, PDF, analytics, dashboard stats
        │   ├── customers/
        │   ├── deliveryRecords/
        │   ├── lanes/
        │   ├── pay/         # Public UPI redirect endpoint
        │   ├── payments/
        │   ├── products/
        │   ├── tenants/     # Settings, logo upload
        │   └── users/       # Delivery boy management
        └── utils/           # async, response, pdf, billing, upload helpers
```

---

## User Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access — all modules, all lanes, settings, billing, analytics |
| **USER** (Delivery Boy) | Restricted — only assigned lanes, only today's deliveries, no billing |

---

## Subscription Plans

| Plan | Price | Description |
|------|-------|-------------|
| **free** | ₹0 | 30-day trial, full access |
| **pro** | ₹699/mo | Unlimited, all features |
| **enterprise** | ₹1299/mo | Unlimited + priority support |

On trial expiry: **read-only mode** — all GETs work, all mutations return `403 SUBSCRIPTION_EXPIRED`.

---

## Getting Started

See [`/client/README.md`](./client/README.md) and [`/server/README.md`](./server/README.md) for setup instructions.

---

## Architecture

See `/docs/` for:
- System architecture diagram
- Entity relationship diagram
- API documentation (Postman collection)
- Architecture decision records

---

## Contact

Built by the DairyFlow team. For support or sales: WhatsApp +91 98344 39861
