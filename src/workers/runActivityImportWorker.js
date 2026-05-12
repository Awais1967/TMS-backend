import "../Utils/loadEnv.js";
import mongoose from "mongoose";
import connectToDatabase from "../Utils/db.js";
import { runOneActivityImport } from "./activityImportWorker.js";

const POLL_MS = Math.max(500, Number(process.env.ACTIVITY_IMPORT_POLL_MS) || 2000);

let running = false;
let shuttingDown = false;
let intervalId = null;

const loop = async () => {
  if (running || shuttingDown) return;
  running = true;
  try {
    const didWork = await runOneActivityImport();
    // if no job, chill until next tick
    if (!didWork) return;
  } catch (e) {
    console.error("worker loop error:", e?.stack || e);
  } finally {
    running = false;
  }
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[ActivityImportWorker] ${signal} received, shutting down...`);
  if (intervalId) clearInterval(intervalId);
  try {
    await mongoose.disconnect();
  } catch (err) {
    console.error("[ActivityImportWorker] shutdown error:", err?.stack || err);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const start = async () => {
  await connectToDatabase(process.env.MONGODB_URL);
  intervalId = setInterval(loop, POLL_MS);
  console.log(`[ActivityImportWorker] running with poll=${POLL_MS}ms`);
  void loop();
};

start().catch((err) => {
  console.error("[ActivityImportWorker] startup failed:", err?.stack || err);
  process.exit(1);
});
