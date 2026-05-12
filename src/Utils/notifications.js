// src/Utils/notifications.js
import Notification from "../Models/Notification.js";

export async function createNotification(payload) {
  const {
    userId,
    type,
    title,
    message,
    tone = "info",
    icon = "bell",
    data = {},
    dedupeKey,
  } = payload || {};

  if (!userId || !type || !title || !message) return;

  // ✅ if dedupeKey exists -> upsert
  if (dedupeKey) {
    await Notification.updateOne(
      { userId, dedupeKey },
      {
        $setOnInsert: {
          userId,
          type,
          title,
          message,
          tone,
          icon,
          data,
          dedupeKey,
          readAt: null,
        },
      },
      { upsert: true }
    );
    return;
  }

  // normal insert
  await Notification.create({
    userId,
    type,
    title,
    message,
    tone,
    icon,
    data,
    readAt: null,
  });
}

