const buckets = new Map();

export function rateLimit({ key = "global", windowMs = 60_000, max = 30 }) {
  return (req, res, next) => {
    const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").toString();
    const guestToken = req.guestToken || "";
    const bucketKey = `${key}:${guestToken || ip}`;

    const now = Date.now();
    const entry = buckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    buckets.set(bucketKey, entry);

    if (entry.count > max) {
      return res.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
      });
    }

    next();
  };
}
