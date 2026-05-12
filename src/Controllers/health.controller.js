import asyncHandler from "../Utils/asyncHandler.js";
import { sendSuccess } from "../Utils/apiResponse.js";

export const getHealth = asyncHandler(async (_req, res) => {
  return sendSuccess(res, "TMS API is running", {
    status: "ok",
    service: "TMS Backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});
