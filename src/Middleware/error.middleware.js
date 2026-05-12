import { sendError } from "../Utils/apiResponse.js";

export const notFoundHandler = (_req, res) => {
  return sendError(res, "Route not found", 404);
};

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  return sendError(res, message, statusCode);
};
