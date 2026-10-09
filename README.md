# Rivowear: clothing store

```
backend/   Express API + PostgreSQL        (orders, payments, courier, SMS, admin API)
web/       Next.js website + admin panel   (SEO-friendly pages, admin dashboard)
```

## Run on your computer (development)

You need Node 20+ and PostgreSQL.

```bash
# 1. database
createdb rivowear            # or any PostgreSQL you already have

# 2. API   (tables, the first admin and demo products are created automatically)
cd backend && cp .env.example .env     # edit DATABASE_URL if needed
npm install && npm run dev             # http://localhost:4000

# 3. website
cd web && cp .env.example .env.local
npm install && npm run dev             # http://localhost:3000
```
Admin panel: http://localhost:3000/admin — in development, the default is `admin@rivowear.com` / `Admin@123`. Production requires a unique `ADMIN_CONTACT` and `ADMIN_PASSWORD` in `backend/.env` before the first start; the API refuses to create a production admin with the default password.

## Run on a server (Docker)

```bash
cp .env.example .env                 # set POSTGRES_PASSWORD, SITE_URL, PUBLIC_API_URL
cp backend/.env.example backend/.env # set JWT_SECRET, ADMIN_CONTACT, ADMIN_PASSWORD, Steadfast / SMS / SSLCommerz keys
docker compose up -d --build         # database + API + website
```
Put a reverse proxy with HTTPS (Caddy or Nginx) in front: your domain -> port 3000, `api.yourdomain.com` -> port 4000.
Then set `SITE_URL=https://yourdomain.com`, `PUBLIC_API_URL=https://api.yourdomain.com`, and in `backend/.env` `CLIENT_ORIGIN` and `SITE_URL` to the same website address. The website can also be hosted on Vercel (set `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL`); keep the API and database on your own server.

**Back up the database** (`docker compose exec db pg_dump -U rivowear rivowear > backup.sql`) and the `uploads` volume regularly. Orders live in PostgreSQL.

## Running more than one API server
The API keeps no state in its own memory, so you can run several copies behind a load balancer (or restart one without anyone noticing).
- **Rate limits** (login, OTP, tracking ...) are counted in PostgreSQL (`rate_limits`), so all servers share one count and a restart does not reset it.
- **Live order tracking** uses PostgreSQL `LISTEN/NOTIFY`: a change made on any server reaches customers connected to every server. No Redis needed. If you use PgBouncer, set `LISTEN_DATABASE_URL` to a direct connection.
- **Background jobs** (courier sync, cancelling unpaid orders, clean-up) take a database lock, so each runs on one server at a time.
- **Start-up** (migrations, first admin, demo products) is locked too, so several servers can boot together.
- `GET /api/health` checks the database; point the load balancer's health check at it.
- Every server needs the **same `JWT_SECRET`** (the API refuses to start in production without it).
- **Uploaded photos are still files on one disk** (`UPLOAD_DIR`). With servers on different machines, put `uploads` on shared storage (NFS/volume) or move uploads to object storage (S3, Cloudflare R2) before scaling out. On one machine with a shared Docker volume it already works.
- Limits are per IP address. Many mobile customers in Bangladesh share one IP (carrier NAT), so keep the limits generous for public pages.

## Couriers (Steadfast and others)
The shop is built so any Bangladeshi courier can be used. Today:
- **Steadfast**: connected by API (parcel creation, status sync, webhook).
- **Other courier (manual)**: works for *any* courier right now (Pathao, RedX, Paperfly, eCourier, Sundarban, SA Paribahan ...). Book the parcel on that courier's own site/app, then on the order page choose "Other courier (manual)" and type the courier name + its tracking code. The order becomes Shipped and the customer gets the SMS. There is no automatic status, so mark Delivered/Returned yourself.
- Orders sent by any courier show the right courier name to the customer on the tracking page.

### Adding another courier by API (when you need it)
1. **Offline:** open a merchant account with that courier and get its API credentials; read its API docs.
2. Copy `backend/src/services/couriers/template.ts` to e.g. `redx.ts`, fill in the endpoints/field names/status words from the docs (the template has comments on every line).
3. Put the keys in `backend/.env` (and `config.ts`), import the file in `services/couriers/index.ts` and add it to the `all` list.
4. It then appears in the admin courier drop-down automatically. Set `DEFAULT_COURIER=redx` in `.env` to pre-select it and use it for bulk send.
Notes: some couriers need extra data (Pathao: store id and city/zone/area codes; RedX: delivery area), and some offer webhooks (copy `routes/courier.ts`). Courier APIs change, so test with one real parcel first.

## Steadfast webhook (instant delivery updates)
Steadfast calls `POST /api/courier/steadfast/webhook` the moment a parcel changes status, so orders move to Delivered/Returned (and the customer gets the SMS) within seconds instead of up to 10 minutes. The old 10-minute poll stays as a safety net and slows to once an hour when the webhook is on.

**Setup you must do yourself (cannot be done from the code):**
1. Make a long random secret (`openssl rand -hex 32`) and put it in `backend/.env` as `STEADFAST_WEBHOOK_TOKEN=...`, then restart the API.
2. In the Steadfast merchant panel (Settings > API / Webhook): Callback URL = `https://api.yourdomain.com/api/courier/steadfast/webhook`, Auth Token = the same secret. The URL must be public HTTPS (use ngrok to test from your own computer).
3. Check once: send a test from the panel (or ship one real parcel) and look for a `Courier: ...` line in that order's history. If nothing arrives, check the API log for `[steadfast-webhook]`.
4. Steadfast's exact field names/status words can change: if the status does not map correctly, compare a real payload with `routes/courier.ts` and `mapCourierStatus` in `services/steadfast.ts`.

Late or repeated webhooks are harmless: the same status twice is ignored, and an order that is already Delivered/Returned/Cancelled is never moved back.

## Failed messages page
Admin > Failed messages lists every SMS/email that gave up after all retries, with the provider's error. **Retry** gives it a fresh set of tries; **Remove** deletes it. (Checkout/password OTP codes never go through this queue.)

## Customer account
Logged-in customers get an account area (`/account`): profile (name, email, mobile), saved addresses (used at checkout), orders with *Buy again*, wishlist, their reviews (edit/delete), password change, "log out of all other devices", and account deletion. Customers can also add an earlier guest order to their account with its tracking ID and phone number.
Email and mobile number are **not verified** (no one-time code is sent), so they are used for login and as default details only. Orders are never linked to an account by phone alone.

## Stock for each color and size
Every color and size has its own stock (Admin > Products > Edit: a small grid under each color). A size or color that reaches 0 is shown crossed out on the product page, cannot be added to the cart, and the customer sees why ("Size XL is not available in Gray"). The other sizes and colors keep selling. The checkout re-checks the exact color and size, so two customers can never buy the last piece.
Upgrading from an earlier PostgreSQL version: the first start splits each product's old single stock number evenly across its color/size combinations (the total stays the same). **Open Admin > Products and correct the numbers.**

## Moving data from the old JSON version
If you already ran the earlier version and have a `data/db.json`:
```bash
cd backend && npm run import-json -- path/to/db.json     # run once, into an EMPTY database
```
Users (with passwords), products, orders, reviews, coupons and wishlists are copied. Old orders get tracking IDs.

## Going live checklist
1. **Steadfast**: `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY`. Admin > Orders > *Send to Steadfast* creates the parcel with the customer's name, phone, address and COD amount. Status is synced every 10 minutes.
2. **SMS**: `SMS_PROVIDER=brevo` or `bulksmsbd`, `SMS_API_KEY`, `SMS_SENDER_ID`. Brevo transactional SMS may require credits and country permissions for Bangladesh. For another provider change only `backend/src/services/sms.ts`.
3. **Email**: the `SMTP_*` values.
4. **Online payment**: SSLCommerz store ID/password (keep `SSLCOMMERZ_LIVE=false` until sandbox payments work). In the SSLCommerz panel set the IPN URL to `https://api.yourdomain.com/api/payments/sslcommerz/ipn`.
5. **bKash / Nagad send-money**: your merchant numbers in Admin > Settings. Verify each TrxID in Admin > Orders.
6. **WhatsApp**: Admin > Settings > WhatsApp number (digits with country code, e.g. 8801700000000).
7. `NODE_ENV=production`, strong `JWT_SECRET`, `SEED_DEMO_PRODUCTS=false`, HTTPS everywhere.

## Without any keys (test mode)
SMS/emails are printed in the API console, "Send to Steadfast" makes a fake parcel (marked *test mode*), and online payment opens a local test page.

## Search engines (SEO)
Home, shop and every product page are rendered on the server, so Google sees the name, price and photos. Each product has share-preview tags (Facebook / WhatsApp), structured data (price, stock, rating), a canonical address, plus `/sitemap.xml` and `/robots.txt`. Set `NEXT_PUBLIC_SITE_URL` to your real domain and submit `https://yourdomain.com/sitemap.xml` in Google Search Console.
