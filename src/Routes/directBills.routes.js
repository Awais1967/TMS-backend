import express from "express";

import {
  addDirectBillDocument,
  addDirectBillNote,
  createDirectBill,
  deleteDirectBill,
  deleteDirectBillDocument,
  deleteDirectBillNote,
  getDirectBillById,
  getDirectBills,
  updateBillStatus,
  updateDirectBill,
  updateDispute,
  updatePayment,
  updatePaymentStatus,
} from "../Controllers/directBills.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";
import { uploadDocumentFile } from "../Middleware/upload.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getDirectBills);
router.post("/", createDirectBill);
router.get("/:id", getDirectBillById);
router.put("/:id", updateDirectBill);
router.patch("/:id/payment-status", updatePaymentStatus);
router.patch("/:id/bill-status", updateBillStatus);
router.patch("/:id/payment", updatePayment);
router.patch("/:id/dispute", updateDispute);
router.post("/:id/documents", uploadDocumentFile, addDirectBillDocument);
router.delete("/:id/documents/:documentId", deleteDirectBillDocument);
router.post("/:id/notes", addDirectBillNote);
router.delete("/:id/notes/:noteId", deleteDirectBillNote);
router.delete("/:id", deleteDirectBill);

export default router;
