import jwt from "jsonwebtoken";
import GuestEvent from "../Models/GuestEvent.js";

function trackBlockedSafe(req, reasonCode) {
  // never block API if tracking fails
  try {
    const guestToken = req.guestToken || "";
    if (!guestToken) return;

    GuestEvent.create({
      type: "blocked_action",
      guestToken,
      userId: null,
      path: req.originalUrl || req.path,
      method: req.method,
      ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString(),
      userAgent: String(req.headers["user-agent"] || ""),
      referrer: String(req.headers["referer"] || ""),
      data: { code: reasonCode },
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    trackBlockedSafe(req, "AUTH_REQUIRED");
    return res.status(401).json({
      code: "AUTH_REQUIRED",
      message: "Please login / signup to continue.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id || decoded._id,
      userId: decoded.userId || decoded.id || decoded._id, // compatibility
    };

    req.userId = req.user.id;

    next();
  } catch (err) {
    trackBlockedSafe(req, "AUTH_INVALID");
    return res.status(401).json({
      code: "AUTH_INVALID",
      message: "Invalid or expired token.",
    });
  }
};
