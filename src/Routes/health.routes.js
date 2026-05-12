import express from "express";

import { getHealth } from "../Controllers/health.controller.js";

const router = express.Router();

router.get("/", getHealth);

export default router;
