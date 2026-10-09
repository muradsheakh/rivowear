const env = (name: string, fallback = "") => process.env[name] ?? fallback;

export const config = {
  port: Number(env("PORT", "4000")),
  clientOrigin: env("CLIENT_ORIGIN", "http://localhost:3000"),
  siteUrl: env("SITE_URL", env("CLIENT_ORIGIN", "http://localhost:3000").split(",")[0] ?? "http://localhost:3000"),
  publicApiUrl: env("PUBLIC_API_URL", `http://localhost:${env("PORT", "4000")}`),
  isProd: env("NODE_ENV") === "production",
  // true = Cash on Delivery orders need the customer to confirm their phone with an SMS code first.
  checkoutOtp: env("CHECKOUT_OTP") === "true",
  // Courier pre-selected in the admin panel and used by "bulk send". See services/couriers/index.ts.
  defaultCourier: env("DEFAULT_COURIER", "steadfast"),
  reviewRequiresDelivery: env("REVIEW_REQUIRES_DELIVERY", "true") !== "false",
  steadfast: {
    apiKey: env("STEADFAST_API_KEY"),
    secretKey: env("STEADFAST_SECRET_KEY"),
    baseUrl: env("STEADFAST_BASE_URL", "https://portal.packzy.com/api/v1"),
    // OFFLINE SETUP: the same secret you type into the Steadfast panel as the webhook "Auth Token" (see README > Steadfast webhook).
    webhookToken: env("STEADFAST_WEBHOOK_TOKEN"),
  },
  sms: {
    provider: env("SMS_PROVIDER", "console"),
    apiKey: env("SMS_API_KEY"),
    senderId: env("SMS_SENDER_ID"),
  },
  smtp: {
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT", "587")),
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    from: env("SMTP_FROM", "Rivowear <no-reply@rivowear.com>"),
  },
  sslcommerz: {
    storeId: env("SSLCOMMERZ_STORE_ID"),
    storePass: env("SSLCOMMERZ_STORE_PASSWORD"),
    live: env("SSLCOMMERZ_LIVE") === "true",
  },
};

export const steadfastConfigured = () => Boolean(config.steadfast.apiKey && config.steadfast.secretKey);
export const sslConfigured = () => Boolean(config.sslcommerz.storeId && config.sslcommerz.storePass);
