import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import accountRoutes from "./routes/account.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import courierRoutes from "./routes/courier.js";
import catalogRoutes from "./routes/catalog.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes from "./routes/payments.js";
import reviewRoutes from "./routes/reviews.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { instanceId, realtimeStatus } from "./lib/realtime.js";
import { UPLOAD_DIR } from "./lib/upload.js";

const app = express();
app.set("trust proxy", 1);

app.use(cors({ origin: config.clientOrigin.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" })); // SSLCommerz posts forms

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: "30d",
    setHeaders: (response) => {
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// Load balancers should use this: a server that cannot reach the database is taken out of rotation.
app.get("/api/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", service: "rivowear-api", instance: instanceId.slice(0, 8), ...realtimeStatus() });
  } catch {
    response.status(503).json({ status: "database-unavailable", service: "rivowear-api" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/courier", courierRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", catalogRoutes);
app.use("/api", reviewRoutes);
app.use("/api", orderRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found." });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError || (error instanceof Error && error.message.startsWith("Only JPG"))) {
    response.status(400).json({ message: error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? "Each image must be under 4 MB." : error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ message: "Unexpected server error." });
});

export default app;
