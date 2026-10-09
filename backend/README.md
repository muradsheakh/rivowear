# Rivowear API

Express + TypeScript API for the storefront and admin panel, backed by PostgreSQL. On startup, the API runs database migrations and seeds initial settings, an administrator, and demo products.

## Run locally

```bash
cp .env.example .env     # then edit JWT_SECRET
npm install
npm run dev              # http://localhost:4000
```

In development, the default admin is `admin@rivowear.com` / `Admin@123`. Production requires explicit `ADMIN_CONTACT` and `ADMIN_PASSWORD` values in `.env`; startup refuses to create the first administrator with the default password.

Admin and customer are separate account roles. When the first admin is seeded, an existing customer with the configured `ADMIN_CONTACT` is promoted to admin and its password is set from `ADMIN_PASSWORD`; after an admin already exists, changing these environment variables does not change existing accounts.

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

## Brevo SMS and email

Brevo can send transactional SMS with `SMS_PROVIDER=brevo`, `SMS_API_KEY` (a Brevo API key), and `SMS_SENDER_ID` (a Brevo-approved sender name). The SMS sender is limited by Brevo to 11 alphanumeric or 15 numeric characters. Brevo may require SMS credits and country permissions before a message can be delivered; check the account's transactional SMS availability for Bangladesh.

Email can use Brevo's SMTP relay with `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER` set to the SMTP login shown in Brevo, `SMTP_PASS` set to its SMTP key, and `SMTP_FROM` set to a verified sender. The SMTP key is distinct from the Brevo API key. Keep all credentials in the hosting provider's environment variables, never in Git.

## Still not included

Online payment (only cash on delivery), Google/Facebook/Apple login, product image upload (products use image URLs), and a database setup intended for large-scale production.
