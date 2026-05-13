import express from "express";

import {
  assignTruckToLoad,
  getAvailableTrucks,
  getTruckNeedCoverLoadById,
  getTruckNeedCoverLoads,
  unassignTruckFromLoad,
  updateLoadPriority,
} from "../Controllers/truckNeedCover.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", getTruckNeedCoverLoads);
router.get("/available-trucks", getAvailableTrucks);
router.get("/:loadId", getTruckNeedCoverLoadById);
router.patch("/:loadId/assign", assignTruckToLoad);
router.patch("/:loadId/unassign", unassignTruckFromLoad);
router.patch("/:loadId/priority", updateLoadPriority);

export default router;
