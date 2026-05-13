import express from "express";

import {
  addFactoringDocument,
  addFactoringNote,
  createFactoringRecord,
  deleteFactoringDocument,
  deleteFactoringNote,
  deleteFactoringRecord,
  getFactoringById,
  getFactoringRecords,
  rejectFactoringRecord,
  updateDocumentsStatus,
  updateFactoringRecord,
  updateFactoringStatus,
  updatePaymentStatus,
} from "../Controllers/factoring.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getFactoringRecords);
router.post("/", createFactoringRecord);
router.get("/:id", getFactoringById);
router.put("/:id", updateFactoringRecord);
router.patch("/:id/status", updateFactoringStatus);
router.patch("/:id/payment-status", updatePaymentStatus);
router.patch("/:id/documents-status", updateDocumentsStatus);
router.patch("/:id/reject", rejectFactoringRecord);
router.post("/:id/documents", uploadDocumentFile, addFactoringDocument);
router.delete("/:id/documents/:documentId", deleteFactoringDocument);
router.post("/:id/notes", addFactoringNote);
router.delete("/:id/notes/:noteId", deleteFactoringNote);
router.delete("/:id", deleteFactoringRecord);

export default router;
