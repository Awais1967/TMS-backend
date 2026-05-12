import { uploadBufferToS3 as uploadBufferToS3Client } from "../Utils/s3Client.js";

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const normalizePrefix = (prefix) => {
  if (!prefix) return "uploads";
  return String(prefix).replace(/^\/+|\/+$/g, "");
};

const buildKey = ({ mimetype, keyPrefix }) => {
  const ext = MIME_TO_EXT[mimetype] || ".jpg";
  const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${normalizePrefix(keyPrefix)}/${unique}${ext}`;
};

export const uploadBufferToS3 = async ({ buffer, mimetype, keyPrefix }) => {
  const key = buildKey({ mimetype, keyPrefix });
  return uploadBufferToS3Client({
    buffer,
    key,
    contentType: mimetype,
  });
};
