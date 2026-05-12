import express from "express";
import { authenticate } from "../Middleware/Authenticate.js";
import { optionalAuth } from "../Middleware/OptionalAuth.js";
import { applyTester, getTesterStatus } from "../Controllers/TesterController.js";

const router = express.Router();

router.post("/apply", optionalAuth, applyTester);
router.get("/status", authenticate, getTesterStatus);

export default router;
