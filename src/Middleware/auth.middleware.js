import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError } from "../Utils/apiResponse.js";
import { verifyToken } from "../Utils/jwt.js";
import User from "../Models/User.model.js";

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return sendError(res, "Authorization token is required", 401);
  }

  const token = authHeader.split(" ")[1];
  let decoded;

  try {
    decoded = verifyToken(token);
  } catch (_error) {
    return sendError(res, "Invalid or expired token", 401);
  }

  if (mongoose.connection.readyState !== 1) {
    return sendError(res, "Database connection is not available", 503);
  }

  const user = await User.findById(decoded.userId).select("-password");

  if (!user || user.status !== "active") {
    return sendError(res, "User not found or inactive", 401);
  }

  req.user = user;
  return next();
});

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return sendError(res, "Admin access required", 403);
  }

  return next();
};
