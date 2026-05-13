import express from "express";

import {
  createTrackingRecord,
  deleteTrackingRecord,
  getTrackingByTruckId,
  getTrackingRecords,
  updateTrackingLocation,
  updateTrackingProgress,
  updateTrackingRecord,
  updateTrackingStatus,
} from "../Controllers/tracking.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getTrackingRecords);
router.post("/", createTrackingRecord);
router.get("/:truckId", getTrackingByTruckId);
router.put("/:id", updateTrackingRecord);
router.patch("/:truckId/location", updateTrackingLocation);
router.patch("/:truckId/status", updateTrackingStatus);
router.patch("/:truckId/progress", updateTrackingProgress);
router.delete("/:id", deleteTrackingRecord);

export default router;
