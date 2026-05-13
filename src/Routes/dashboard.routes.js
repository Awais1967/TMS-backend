import express from "express";

import {
  getDashboardBilling,
  getDashboardCharts,
  getDashboardLeaderboard,
  getDashboardOperations,
  getDashboardStats,
  getDashboardSummary,
  getDashboardTopCustomers,
} from "../Controllers/dashboard.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/summary", getDashboardSummary);
router.get("/stats", getDashboardStats);
router.get("/charts", getDashboardCharts);
router.get("/top-customers", getDashboardTopCustomers);
router.get("/leaderboard", getDashboardLeaderboard);
router.get("/billing", getDashboardBilling);
router.get("/operations", getDashboardOperations);

export default router;
