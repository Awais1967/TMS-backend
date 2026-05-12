import express from "express";

import { createAdmin, login, logout, me } from "../Controllers/auth.controller.js";
import { protect, requireAdmin } from "../Middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/create-admin", createAdmin);
router.get("/me", protect, requireAdmin, me);
router.post("/logout", protect, requireAdmin, logout);

export default router;
