# DairyFlow — Frontend

React + Vite SPA for the DairyFlow dairy operations platform.

---

## Prerequisites

- Node.js v18+
- npm v9+

---

## Local Setup

```bash
# 1. Navigate to client directory
cd client

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Fill in values (see Environment Variables below)

# 4. Start development server
npm run dev
# App runs on http://localhost:5173
```

---

## Environment Variables

Create `client/.env`:

```env
# Backend API URL — use localhost for development
VITE_API_URL=http://localhost:5000

# Frontend URL — used to build UPI payment links in WhatsApp messages
# In development: http://localhost:5173
# In production: your Vercel frontend URL e.g. https://dairy-app-live.vercel.app
VITE_APP_URL=http://localhost:5173
```

**Important:** `VITE_API_URL` and `VITE_APP_URL` are different things:
- `VITE_API_URL` → where your backend server is (for all API calls)
- `VITE_APP_URL` → where your frontend is (for building WhatsApp UPI payment links)

---

## Available Scripts

```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build locally
```

---

## Vercel Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard:
   ```
   VITE_API_URL  = https://your-backend.vercel.app
   VITE_APP_URL  = https://your-frontend.vercel.app
   ```
4. Vercel auto-deploys on every push to main

The `client/vercel.json` handles SPA routing and the `/pay.html` public page:
```json
{
  "rewrites": [
    { "source": "/pay.html", "destination": "/pay.html" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

---

## Project Structure

```
src/
├── api/                 # All API call functions (one file per backend module)
│   ├── axios.js         # Axios instance + interceptors (auth + subscription handling)
│   ├── auth.api.js
│   ├── billing.api.js
│   ├── customer.api.js
│   ├── tenant.api.js
│   └── ...
│
├── app/
│   ├── AppRouter.jsx        # All routes defined here
│   ├── ProtectedRoute.jsx   # Redirects unauthenticated users to /login
│   └── PublicOnlyRoute.jsx  # Redirects authenticated users away from /login, /register
│
├── components/          # Shared UI components
│   ├── BillViewModal.jsx          # Bill preview + WhatsApp share + PDF download
│   ├── CustomerFinancialPanel.jsx # Customer billing history panel
│   ├── SubscriptionExpiredModal.jsx # Shown when trial expires (triggered by axios)
│   ├── TrialBanner.jsx            # Dismissible trial status banner in AdminLayout
│   ├── Toast.jsx
│   └── WhatsAppButton.jsx
│
├── context/
│   ├── AuthContext.jsx    # JWT auth state — user, login(), logout(), loading
│   └── TenantContext.jsx  # Tenant settings — loaded once on login, cached globally
│
├── features/            # Page components organized by feature
│   ├── analytics/       # Revenue trends, collection rate, payment modes
│   ├── auth/            # Login, Register, ForgotPassword, ResetPassword
│   ├── billing/         # Bill generation, WhatsApp blast, customer financials
│   ├── bulkBilling/     # Generate bills for all customers in a lane at once
│   ├── customers/       # Customer CRUD
│   ├── dashboard/       # AdminDashboard (live delivery strip), UserDashboard
│   ├── deliveries/      # Daily delivery marking (admin + delivery boy view)
│   ├── deliveryBoys/    # Delivery boy CRUD + lane assignment
│   ├── deliverySummary/ # Live lane-wise delivery progress (auto-refreshes)
│   ├── lanes/           # Lane CRUD
│   ├── outstanding/     # All unpaid bills with urgency + WhatsApp reminders
│   ├── products/        # Product CRUD (milk types, rates)
│   └── settings/        # Business profile, logo, UPI ID, subscription info
│
├── hooks/
│   ├── useTenant.js     # Shorthand for TenantContext (throws if used outside provider)
│   └── useToast.js      # Toast notification hook
│
├── layouts/
│   ├── AdminLayout.jsx  # Sidebar nav + TrialBanner + SubscriptionExpiredModal
│   └── UserLayout.jsx   # Minimal layout for delivery boy view
│
└── utils/
    └── whatsapp.util.js # buildWhatsAppMessage, buildReminderMessage, shareOnWhatsApp
```

---

## Key Concepts

### Authentication Flow
```
User logs in → JWT stored in localStorage
→ AuthContext decodes JWT → sets user state
→ TenantContext fetches /api/tenant/settings → caches tenant data
→ All API calls attach JWT via axios request interceptor
→ 401 response → auto-logout + redirect to /login
→ 403 + SUBSCRIPTION_EXPIRED → window event → SubscriptionExpiredModal shown
```

### Route Guards
- `ProtectedRoute` — wraps all `/admin` and `/user` routes. Unauthenticated → `/login`
- `PublicOnlyRoute` — wraps `/login`, `/register`, `/forgot-password`, `/reset-password`. Authenticated → dashboard

### UPI Payment Links
WhatsApp messages include an HTTPS pay link:
```
https://dairy-app-live.vercel.app/pay.html?pa=upi@id&pn=DairyName&am=500&tn=Milk+Bill
```
`pay.html` is a static page in `/public` that auto-redirects to `upi://` deep link on mobile, opening GPay/PhonePe with amount pre-filled. WhatsApp only makes `https://` links tappable — raw `upi://` appears as plain text.

### Role-based UI
- ADMIN (`/admin/*`) → full sidebar, all modules
- USER (`/user/*`) → minimal layout, only deliveries for assigned lanes