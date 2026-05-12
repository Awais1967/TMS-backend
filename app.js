import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./src/Routes/health.routes.js";
import authRoutes from "./src/Routes/auth.routes.js";
import { errorHandler, notFoundHandler } from "./src/Middleware/error.middleware.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, "uploads");

const app = express();

const normalizeOrigin = (origin) => String(origin || "").replace(/\/$/, "").trim();
const clientUrl = normalizeOrigin(process.env.CLIENT_URL || "http://localhost:5173");
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  clientUrl,
]);

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsPath));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
