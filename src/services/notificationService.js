import mongoose from "mongoose";
import User from "../Models/User.js";
import Notification from "../Models/Notification.js";
import { notifyLater } from "../Utils/notifyLater.js";

let ADMIN_CACHE = {
  ids: [],
  fetchedAt: 0,
};

const ADMIN_CACHE_TTL_MS = 60 * 1000;
const ADMIN_ROLES = ["admin", "superadmin"];

function asObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (!mongoose.isValidObjectId(String(id))) return null;
  return new mongoose.Types.ObjectId(String(id));
}

function cleanString(v) {
  return typeof v === "string" ? v.trim() : "";
}


export async function createNotificationSafe(payload) {
  try {
    const userId = asObjectId(payload?.userId);
    if (!userId) return { ok: false, error: "Invalid userId" };

    const type = cleanString(payload?.type);
    const title = cleanString(payload?.title);
    const message = cleanString(payload?.message);

    if (!type || !title || !message) {
      return { ok: false, error: "Missing required fields (type/title/message)" };
    }

    const doc = {
      userId,
      type,
      title,
      message,
      icon: cleanString(payload?.icon),
      tone: payload?.tone || "info",
      data: payload?.data && typeof payload.data === "object" ? payload.data : {},
      expiresAt: payload?.expiresAt ? new Date(payload.expiresAt) : null,
    };

    const dedupeKey = cleanString(payload?.dedupeKey);

    //  Dedupe path (best): atomic upsert => no E11000 issues
    if (dedupeKey) {
      doc.dedupeKey = dedupeKey;

      const result = await Notification.updateOne(
        { userId, dedupeKey },
        { $setOnInsert: doc },
        { upsert: true }
      );

      // Mongoose result differs by version; handle both
      const upserted =
        typeof result.upsertedCount === "number"
          ? result.upsertedCount > 0
          : Array.isArray(result.upserted) && result.upserted.length > 0;

      return { ok: true, created: upserted };
    }

    //  Normal insert path
    await Notification.create(doc);
    return { ok: true, created: true };
  } catch (e) {
    // If anything slips through (rare), never crash caller
    const msg = e?.message || String(e);
    return { ok: false, error: msg };
  }
}

async function getAdminIds({ forceRefresh = false } = {}) {
  const now = Date.now();

  if (
    !forceRefresh &&
    ADMIN_CACHE.ids.length &&
    now - ADMIN_CACHE.fetchedAt < ADMIN_CACHE_TTL_MS
  ) {
    return ADMIN_CACHE.ids;
  }

  const admins = await User.find({ role: { $in: ADMIN_ROLES } })
    .select("_id")
    .lean();

  ADMIN_CACHE.ids = admins.map((a) => String(a._id));
  ADMIN_CACHE.fetchedAt = now;

  return ADMIN_CACHE.ids;
}


export function notifyUser(payload) {
  if (!payload?.userId) return;

  notifyLater(async () => {
    const res = await createNotificationSafe(payload);
    if (!res.ok) {
      console.warn("[notifyUser] failed:", res.error);
    }
  });
}


export function notifyAdmins(item, { excludeAdminId, forceRefresh = false } = {}) {
  notifyLater(async () => {
    try {
      const adminIds = await getAdminIds({ forceRefresh });

      const targets = adminIds.filter((id) =>
        excludeAdminId ? id !== String(excludeAdminId) : true
      );

      if (!targets.length) return;

      await Promise.all(
        targets.map((adminId) =>
          createNotificationSafe({
            userId: adminId,
            ...item,
          })
        )
      );
    } catch (e) {
      console.warn("[notifyAdmins] failed:", e?.message || e);
    }
  });
}

export function notifyManyUsers(userIds = [], itemBuilder) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;

  notifyLater(async () => {
    try {
      await Promise.all(
        userIds.map((uid) => {
          const item =
            typeof itemBuilder === "function" ? itemBuilder(uid) : itemBuilder;

          if (!item) return null;

          return createNotificationSafe({
            userId: uid,
            ...item,
          });
        })
      );
    } catch (e) {
      console.warn("[notifyManyUsers] failed:", e?.message || e);
    }
  });
}
