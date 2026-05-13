import express from "express";

import {
  deleteDocument,
  getDocumentById,
  getDocuments,
  getDocumentsByLoadNumber,
  updateDocumentStatus,
  uploadDocument,
} from "../Controllers/documents.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getDocuments);
router.get("/load/:loadNumber", getDocumentsByLoadNumber);
router.post("/upload", uploadDocumentFile, uploadDocument);
router.get("/:id", getDocumentById);
router.patch("/:id/status", updateDocumentStatus);
router.delete("/:id", deleteDocument);

export default router;
