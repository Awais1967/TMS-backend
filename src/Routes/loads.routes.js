import express from "express";

import {
  createLoad,
  deleteLoad,
  getLoadById,
  getLoads,
  updateLoad,
  updateLoadStatus,
} from "../Controllers/loads.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getLoads);
router.post("/", createLoad);
router.get("/:id", getLoadById);
router.put("/:id", updateLoad);
router.delete("/:id", deleteLoad);
router.patch("/:id/status", updateLoadStatus);

export default router;
