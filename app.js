import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRoutes from "./src/Routes/health.routes.js";
import authRoutes from "./src/Routes/auth.routes.js";
import loadsRoutes from "./src/Routes/loads.routes.js";
import documentsRoutes from "./src/Routes/documents.routes.js";
import carriersRoutes from "./src/Routes/carriers.routes.js";
import driversRoutes from "./src/Routes/drivers.routes.js";
import trucksRoutes from "./src/Routes/trucks.routes.js";
import truckNeedCoverRoutes from "./src/Routes/truckNeedCover.routes.js";
import trackingRoutes from "./src/Routes/tracking.routes.js";
import accountingRoutes from "./src/Routes/accounting.routes.js";
import directBillsRoutes from "./src/Routes/directBills.routes.js";
import factoringRoutes from "./src/Routes/factoring.routes.js";
import settlementRoutes from "./src/Routes/settlement.routes.js";
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
app.use("/api/loads", loadsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/carriers", carriersRoutes);
app.use("/api/drivers", driversRoutes);
app.use("/api/trucks", trucksRoutes);
app.use("/api/truck-need-cover", truckNeedCoverRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/direct-bills", directBillsRoutes);
app.use("/api/factoring", factoringRoutes);
app.use("/api/settlements", settlementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
