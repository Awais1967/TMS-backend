import express from "express";

import {
  addTruckDocument,
  createTruck,
  deleteTruck,
  deleteTruckDocument,
  getTruckById,
  getTrucks,
  updateTruck,
  updateTruckStatus,
  updateTruckTracking,
} from "../Controllers/trucks.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getTrucks);
router.post("/", createTruck);
router.get("/:id", getTruckById);
router.put("/:id", updateTruck);
router.delete("/:id", deleteTruck);
router.patch("/:id/status", updateTruckStatus);
router.patch("/:id/tracking", updateTruckTracking);
router.post("/:id/documents", uploadDocumentFile, addTruckDocument);
router.delete("/:id/documents/:documentId", deleteTruckDocument);

export default router;
