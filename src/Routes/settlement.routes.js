import express from "express";

import {
  addSettlementDocument,
  addSettlementNote,
  createSettlement,
  deleteSettlement,
  deleteSettlementDocument,
  deleteSettlementNote,
  getSettlementById,
  getSettlements,
  rejectSettlement,
  updateSettlement,
  updateSettlementApproval,
  updateSettlementDocumentsStatus,
  updateSettlementPayment,
  updateSettlementStatus,
} from "../Controllers/settlement.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getSettlements);
router.post("/", createSettlement);
router.get("/:id", getSettlementById);
router.put("/:id", updateSettlement);
router.patch("/:id/status", updateSettlementStatus);
router.patch("/:id/approval", updateSettlementApproval);
router.patch("/:id/payment", updateSettlementPayment);
router.patch("/:id/documents-status", updateSettlementDocumentsStatus);
router.patch("/:id/reject", rejectSettlement);
router.post("/:id/documents", uploadDocumentFile, addSettlementDocument);
router.delete("/:id/documents/:documentId", deleteSettlementDocument);
router.post("/:id/notes", addSettlementNote);
router.delete("/:id/notes/:noteId", deleteSettlementNote);
router.delete("/:id", deleteSettlement);

export default router;
