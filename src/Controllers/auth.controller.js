import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import { generateToken } from "../Utils/jwt.js";
import User from "../Models/User.model.js";

const toUserResponse = (user) => {
  if (!user) return null;
  return typeof user.toSafeObject === "function" ? user.toSafeObject() : user;
};

export const createAdmin = asyncHandler(async (req, res) => {
  const setupKey = String(req.headers["x-admin-setup-key"] || "");

  if (!process.env.ADMIN_SETUP_KEY) {
    return sendError(res, "Admin setup key is not configured", 500);
  }

  if (setupKey !== process.env.ADMIN_SETUP_KEY) {
    return sendError(res, "Invalid admin setup key", 403);
  }

  if (mongoose.connection.readyState !== 1) {
    return sendError(res, "Database connection is not available", 503);
  }

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!name || !email || !password) {
    return sendError(res, "Name, email, and password are required", 400);
  }

  if (password.length < 8) {
    return sendError(res, "Password must be at least 8 characters", 400);
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return sendError(res, "User with this email already exists", 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "admin",
    status: "active",
  });

  return sendSuccess(
    res,
    "Admin created successfully",
    {
      user: toUserResponse(user),
    },
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return sendError(res, "Email and password are required", 400);
  }

  if (mongoose.connection.readyState !== 1) {
    return sendError(res, "Database connection is not available", 503);
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return sendError(res, "Invalid email or password", 401);
  }

  if (user.status !== "active") {
    return sendError(res, "User account is inactive", 403);
  }

  if (user.role !== "admin") {
    return sendError(res, "Admin access required", 403);
  }

  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return sendSuccess(res, "Login successful", {
    user: toUserResponse(user),
    token,
  });
});

export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, "Authenticated user fetched", {
    user: toUserResponse(req.user),
  });
});

export const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, "Logout successful", {});
});
