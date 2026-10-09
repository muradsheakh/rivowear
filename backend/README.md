# Rivowear API

Express + TypeScript API for the storefront and admin panel, backed by PostgreSQL. On startup, the API runs database migrations and seeds initial settings, an administrator, and demo products.

## Run locally

```bash
cp .env.example .env     # then edit JWT_SECRET
npm install
npm run dev              # http://localhost:4000
```

In development, the default admin is `admin@rivowear.com` / `Admin@123`. Production requires explicit `ADMIN_CONTACT` and `ADMIN_PASSWORD` values in `.env`; startup refuses to create the first administrator with the default password.

## Endpoints

Auth: `POST /api/auth/register | login | logout | forgot-password | reset-password`, `GET /api/auth/me`
Products: `GET /api/products` (filters: `category, gender, q, sort, minPrice, maxPrice, isNew, bestSeller, limit`), `GET /api/products/:id`, `GET /api/products/:id/similar`
Cart: `GET /api/cart`, `PUT /api/cart`
Orders: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`
Admin: `GET /api/admin/summary | orders | customers`, `PATCH /api/admin/orders/:id/status`, `POST/PUT/DELETE /api/admin/products`

## Notes

- Passwords are hashed with scrypt. Login tokens are signed (HS256) and expire after 7 days.
- Password reset sends a 6-digit code by SMS (phone) or email. Codes are stored only as a keyed hash, last 10 minutes, allow 5 wrong tries, and can be re-requested after 60 seconds. With `SMS_PROVIDER=console` / no SMTP the code is printed in the server console (development only; connect a real provider before going live).
- Checkout phone check: set `CHECKOUT_OTP=true` and Cash on Delivery orders need an SMS code first (`POST /api/checkout/otp/send | verify`). 3 codes per number per 15 minutes.
- SMS/email go through an outbox table: saved first, sent right away, and retried if the provider is down (after 1, 5, 15, 60, 180 minutes, then given up; messages older than 24 hours are dropped). Every try appears in Admin > notifications. Password/checkout codes are NOT queued: they are time-sensitive and are never stored in readable form.
- Login is limited per IP and per account (10 attempts / 15 min per account, reset by a correct login).
- Stock is checked and reduced when an order is placed, and restored when it is cancelled.

## Still not included

Online payment (only cash on delivery), email/SMS sending, Google/Facebook/Apple login, image upload (products use image URLs), and a real database for large scale.
