import express from "express";

import {
  addCarrierDocument,
  addCarrierDriver,
  createCarrier,
  deleteCarrier,
  deleteCarrierDriver,
  getCarrierById,
  getCarriers,
  updateCarrier,
  updateCarrierDriverStatus,
  updateCarrierStatus,
} from "../Controllers/carriers.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getCarriers);
router.post("/", createCarrier);
router.get("/:id", getCarrierById);
router.put("/:id", updateCarrier);
router.delete("/:id", deleteCarrier);
router.patch("/:id/status", updateCarrierStatus);
router.post("/:id/documents", uploadDocumentFile, addCarrierDocument);
router.post("/:id/drivers", addCarrierDriver);
router.patch("/:id/drivers/:driverId/status", updateCarrierDriverStatus);
router.delete("/:id/drivers/:driverId", deleteCarrierDriver);

export default router;
