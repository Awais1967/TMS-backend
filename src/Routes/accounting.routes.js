import express from "express";

import {
  getAccountingRecordById,
  getAccountingRecords,
  updateAccountingStatus,
} from "../Controllers/accounting.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getAccountingRecords);
router.get("/:id", getAccountingRecordById);
router.patch("/:id/status", updateAccountingStatus);

export default router;
