import { pool } from "./pool.js";

// Add new entries at the END of this list to change the database later. Never edit an old one.
const migrations: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  contact text NOT NULL,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_contact_idx ON users (lower(contact));

CREATE TABLE reset_tokens (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL CHECK (price > 0),
  image text NOT NULL DEFAULT '',
  category text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('men','women','unisex')),
  brand text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  sizes text[] NOT NULL DEFAULT '{}',
  colors jsonb NOT NULL DEFAULT '[]',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_new_arrival boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category);
CREATE INDEX products_gender_idx ON products (gender);
CREATE INDEX products_created_idx ON products (created_at DESC);

CREATE TABLE carts (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wishlists (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE SEQUENCE order_seq START 1001;

CREATE TABLE orders (
  id text PRIMARY KEY,
  tracking_id text NOT NULL UNIQUE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  items jsonb NOT NULL,
  shipping jsonb NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cod','sslcommerz','bkash_manual','nagad_manual')),
  payment_status text NOT NULL CHECK (payment_status IN ('unpaid','pending_verification','paid','failed','refunded')),
  payment jsonb,
  subtotal numeric(12,2) NOT NULL,
  shipping_fee numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  total numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('Pending','Processing','Shipped','Delivered','Cancelled','Returned')),
  courier jsonb,
  history jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders (user_id);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_idx ON orders (created_at DESC);
CREATE INDEX orders_tran_idx ON orders ((payment->>'tranId'));
CREATE INDEX orders_items_idx ON orders USING gin (items jsonb_path_ops);

CREATE TABLE reviews (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  order_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE TABLE coupons (
  code text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('percent','fixed')),
  value numeric(12,2) NOT NULL CHECK (value > 0),
  min_subtotal numeric(12,2) NOT NULL DEFAULT 0,
  expires_at timestamptz,
  usage_limit integer,
  used integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE settings (
  id integer PRIMARY KEY CHECK (id = 1),
  data jsonb NOT NULL
);

CREATE TABLE notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel text NOT NULL,
  recipient text NOT NULL,
  message text NOT NULL,
  ok boolean NOT NULL,
  detail text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_at_idx ON notifications (at DESC);
`,
  },
  {
    version: 2,
    sql: `
-- Stock is now kept for every color and size, so one sold-out size never hides the rest.
CREATE TABLE product_variants (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color text NOT NULL,
  size text NOT NULL,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  PRIMARY KEY (product_id, color, size)
);

-- Existing products only had one total. Share it evenly over their color/size combinations
-- (any remainder goes to the first one). Check the numbers in Admin > Products afterwards.
INSERT INTO product_variants (product_id, color, size, stock)
SELECT p.id, c.value->>'name', s.size,
       p.stock / n.total + CASE WHEN c.ord = 1 AND s.ord = 1 THEN p.stock % n.total ELSE 0 END
FROM products p
CROSS JOIN LATERAL jsonb_array_elements(p.colors) WITH ORDINALITY AS c(value, ord)
CROSS JOIN LATERAL unnest(p.sizes) WITH ORDINALITY AS s(size, ord)
CROSS JOIN LATERAL (SELECT GREATEST(1, jsonb_array_length(p.colors) * cardinality(p.sizes)) AS total) n
ON CONFLICT DO NOTHING;

ALTER TABLE products DROP COLUMN stock;
`,
  },
  {
    version: 3,
    sql: `
-- Profile: separate email and phone, saved addresses, and a way to end every old login.
ALTER TABLE users ADD COLUMN email text;
ALTER TABLE users ADD COLUMN phone text;
ALTER TABLE users ADD COLUMN sessions_valid_from timestamptz NOT NULL DEFAULT to_timestamp(0);

UPDATE users SET email = lower(contact) WHERE contact LIKE '%@%';
UPDATE users SET phone = contact WHERE contact ~ '^01[3-9][0-9]{8}$';
CREATE UNIQUE INDEX users_email_idx ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_phone_idx ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE addresses (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_user_idx ON addresses (user_id);
-- A person can have only one default address.
CREATE UNIQUE INDEX addresses_default_idx ON addresses (user_id) WHERE is_default;
`,
  },
  {
    version: 4,
    sql: `
-- Request counters for rate limiting, shared by every API server.
-- UNLOGGED = faster writes; if PostgreSQL crashes the counters simply start again from zero, which is fine.
CREATE UNLOGGED TABLE rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX rate_limits_reset_idx ON rate_limits (reset_at);
`,
  },
  {
    version: 5,
    sql: `
-- One-time codes (password reset now, phone check at checkout later). Only a keyed hash of the code is stored,
-- never the code itself, so a leaked database cannot be used to reset anyone's password.
CREATE TABLE otp_codes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purpose text NOT NULL,
  target text NOT NULL,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One live code per purpose and target; asking for a new code replaces the old one.
CREATE UNIQUE INDEX otp_codes_target_idx ON otp_codes (purpose, target);
CREATE INDEX otp_codes_expires_idx ON otp_codes (expires_at);

-- The old reset tokens were stored as plain text. They are replaced by otp_codes; anyone mid-reset just asks again.
DROP TABLE reset_tokens;
`,
  },
  {
    version: 6,
    sql: `
-- Outbox: every SMS/email is saved here FIRST, then sent. If the SMS provider or SMTP is down, nothing is lost:
-- the message stays "pending" and is retried with growing waits, on any API server.
CREATE TABLE outbox (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel text NOT NULL CHECK (channel IN ('sms','email')),
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX outbox_due_idx ON outbox (next_attempt_at) WHERE status = 'pending';
CREATE INDEX outbox_status_idx ON outbox (status, created_at DESC);
`,
  },
];

export const migrate = async (upTo = Number.POSITIVE_INFINITY) => {
  const client = await pool.connect();
  try {
    // One migrator at a time, even if several servers start together.
    await client.query("SELECT pg_advisory_lock(727274)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await client.query("SELECT version FROM schema_migrations")).rows.map((row) => row.version as number));
    for (const migration of migrations) {
      if (done.has(migration.version) || migration.version > upTo) continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
        await client.query("COMMIT");
        console.log(`[db] applied migration ${migration.version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(727274)").catch(() => undefined);
    client.release();
  }
};
