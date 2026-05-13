import express from "express";

import {
  addDriverDocument,
  createDriver,
  deleteDriver,
  deleteDriverDocument,
  getDriverById,
  getDrivers,
  reassignDriverTruck,
  updateDriver,
  updateDriverStatus,
} from "../Controllers/drivers.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getDrivers);
router.post("/", createDriver);
router.get("/:id", getDriverById);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);
router.patch("/:id/status", updateDriverStatus);
router.patch("/:id/reassign-truck", reassignDriverTruck);
router.post("/:id/documents", uploadDocumentFile, addDriverDocument);
router.delete("/:id/documents/:documentId", deleteDriverDocument);

export default router;
