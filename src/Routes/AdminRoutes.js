import express from "express";

import {
  approveActivity,
  getParentApprovalActivity,
  changeTestUserPassword,
  getAllBadges,
  getAllMarketingUsers,
  deleteUser,
  getTestFamilyUsers,
  getUserDetailsWithActivities,
  getAllUsersWithSubscription,
  createBulkActivities,
  adminLogin,
  createActivity,
  getAllActivities,
  getActivityCounts,
  getPlatformStats,
  getRewardPool,
  setRewardPool,
  getAllEvents,
  getAdminActivities,
  getAdminActivityStats,
  updateAdminActivity,
  deleteAdminActivity,
  rejectActivity,
  getBadgeStats,
  getUserStats,
  getAllUsers,
  updateUser,
  updateUserStatus,
  updateAdminCountryCode,
  getTesterApplications,
  approveTesterApplication,
  rejectTesterApplication,
  adminGetPendingPhotoPosts,
  adminApprovePhotoPost,
  adminRejectPhotoPost,
} from "../Controllers/AdminController.js";
import {
  adminGetReports,
  adminApproveReport,
  adminRejectReport
} from "../Controllers/AdminReportController.js";
import { getMonitoringStatus } from "../Controllers/MonitoringController.js";
import {
  getAdminSettings,
  updateAdminSettings,
  resetAdminSettings,
  changeAdminPassword,
} from "../Controllers/SettingsController.js";

import upload from "../Middleware/Upload.js";
import { authenticate } from "../Middleware/Authenticate.js";
import { attachAdmin } from "../Middleware/AttachAdmin.js";
import { requirePermission } from "../Middleware/Authorize.js";
import { auditTrail } from "../Middleware/AuditTrail.js";
import { PERMISSIONS } from "../Utils/rbac.js";
import { listAuditLogs } from "../Controllers/AuditLogController.js";

import {
  adminCreateActivityImport,
  adminStartActivityImport,
  adminGetActivityImport,
  adminListActivityImports,
  adminCancelActivityImport,
  adminGetActivityImportErrors,
} from "../Controllers/AdminActivityImportController.js";



console.log("AdminRoutes loaded", new Date().toISOString());

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const register = (method, paths, ...handlers) => {
  const pathList = Array.isArray(paths) ? paths : [paths];
  pathList.forEach((path) => router[method](path, ...handlers));
};

// Only tag scope; requestId already exists from app-level requestContext("api")
const setAdminScope = (req, _res, next) => {
  if (req.context) req.context.scope = "admin";
  next();
};

const adminBase = [
  setAdminScope,
  authenticate,
  attachAdmin,
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  auditTrail("admin", { includeReadPaths: ["/admin/audit-logs"] }),
];

const registerAdmin = (method, paths, ...handlers) => {
  register(method, paths, ...adminBase, ...handlers);
};

const setActivitiesFolder = (req, _res, next) => {
  req.cloudinaryFolder = "activities";
  req.s3Folder = "activities";
  next();
};

const activityUploads = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
  { name: "resources", maxCount: 10 },
]);

/* -------------------------------------------------------------------------- */
/* Public                                                                      */
/* -------------------------------------------------------------------------- */

register("post", "/admin-login", adminLogin);

/* -------------------------------------------------------------------------- */
/* Admin-only (IMPORTANT: no global router.use(auth/attachAdmin) anymore)      */
/* This prevents normal user routes like /calendar/week from getting ADMIN_ONLY */
/* -------------------------------------------------------------------------- */

// Audit logs
// registerAdmin("get", "/admin/audit-logs", listAuditLogs);
router.get("/admin/audit-logs", authenticate, attachAdmin, requirePermission(PERMISSIONS.ADMIN_ACCESS), auditTrail("admin", { includeReadPaths: ["/admin/audit-logs"] }), listAuditLogs);
// Testers moderation
registerAdmin("get", "/admin/testers", getTesterApplications);
registerAdmin("patch", "/admin/testers/:id/approve", approveTesterApplication);
registerAdmin("patch", "/admin/testers/:id/reject", rejectTesterApplication);

// Badges
registerAdmin("get", "/get-all-badges", getAllBadges);
registerAdmin("get", "/badge-stats", getBadgeStats);

// Parent approval activities
registerAdmin(
  "get",
  "/get-all-parent-approval-activities",
  getParentApprovalActivity
);

// Activities bulk + CRUD
registerAdmin("post", "/create-bulk-activities", createBulkActivities);

registerAdmin(
  "post",
  ["/create-activity-by-admin", "/admin/activities"],
  setActivitiesFolder,
  activityUploads,
  createActivity
);

registerAdmin("post", "/approve-activity/:id", approveActivity);
registerAdmin("patch", "/admin/activities/:id/approve", approveActivity);
registerAdmin("patch", "/admin/activities/:id/reject", rejectActivity);

registerAdmin(
  "put",
  ["/edit-activity/:id", "/admin/activities/:id"],
  setActivitiesFolder,
  activityUploads,
  updateAdminActivity
);

registerAdmin(
  "delete",
  ["/delete-activity/:id", "/admin/activities/:id"],
  deleteAdminActivity
);

registerAdmin("get", "/get-all-activities", getAllActivities);
registerAdmin("get", "/admin/activities", getAdminActivities);
registerAdmin("get", "/get-activity-counts", getActivityCounts);
registerAdmin("get", "/admin/activities/stats", getAdminActivityStats);

// Platform stats + monitoring
router.get("/get-platform-stats", getPlatformStats);
registerAdmin("get", "/admin/monitoring/status", getMonitoringStatus);

// Users
registerAdmin(
  "get",
  ["/get-all-users-activities/:id", "/admin/users/:id/details"],
  getUserDetailsWithActivities
);

registerAdmin("get", "/get-all-users", getAllUsersWithSubscription);
registerAdmin("get", "/get-all-test-users", getTestFamilyUsers);

registerAdmin("get", "/admin/users", getAllUsers);
registerAdmin("get", "/admin/users/stats", getUserStats);

registerAdmin("put", "/admin/users/:id", updateUser);
registerAdmin("put", "/admin/users/:id/status", updateUserStatus);

registerAdmin("delete", ["/delete-test-user/:id", "/admin/users/:id"], deleteUser);

// Guests marketing users
registerAdmin("get", "/get-all-guest-user", getAllMarketingUsers);

// Password management
registerAdmin("post", "/change-test-users-password", changeTestUserPassword);

// Rewards
router.get("/get-reward-pool", getRewardPool);
router.post("/set-reward-pool", setRewardPool);

// Tracking events
router.get("/get-all-tracking-events", getAllEvents);

// Settings
registerAdmin("get", "/admin/settings", getAdminSettings);
registerAdmin("put", "/admin/settings", updateAdminSettings);
registerAdmin("post", "/admin/settings/reset", resetAdminSettings);
registerAdmin("put", "/admin/change-password", changeAdminPassword);
registerAdmin("put", "/admin/country-code", updateAdminCountryCode);


/* =========================
   4) ROUTES (AdminCommunityRoutes.js)
   ========================= */

// Photo moderation queue
router.get("/get-pending-photo-posts/:id", authenticate, adminGetPendingPhotoPosts);

// Approve / Reject
router.patch("/approve-photo-post/:id/posts/:postId", authenticate, adminApprovePhotoPost);
router.patch("/reject-photo-post/:id/posts/:postId", authenticate, adminRejectPhotoPost);


router.get("/admin/reports", adminGetReports);
router.patch("/admin/reports/:id/approve", adminApproveReport);
router.patch("/admin/reports/:id/reject", adminRejectReport);

// Activity Imports (S3 presigned + worker)
router.post("/admin/activity-imports", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminCreateActivityImport);
router.post("/admin/activity-imports/:id/start", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminStartActivityImport);

router.get("/admin/activity-imports", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminListActivityImports);

router.get("/admin/activity-imports/:id", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminGetActivityImport);
router.post("/admin/activity-imports/:id/cancel", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminCancelActivityImport);

router.get("/admin/activity-imports/:id/errors", authenticate, requirePermission(PERMISSIONS.ACTIVITIES_BULK_UPLOAD), adminGetActivityImportErrors);

export default router;
