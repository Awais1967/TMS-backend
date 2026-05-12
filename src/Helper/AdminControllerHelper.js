import User from "../Models/User.js";
import { uploadBufferToS3, sanitizeFileName } from "../Utils/s3Client.js";
import { resolveMediaUrl } from "../Utils/mediaUrl.js";

export const ensureAdminUser = async (req, res) => {
  const admin = await User.findById(req.user?.userId);
  if (!admin || admin.role !== "admin") {
    res
      .status(403)
      .json({ success: false, message: "Only admin can access this resource" });
    return null;
  }
  return admin;
};

export const parseArrayField = (value) => {
  if (!value) return [];
  if (value === "") return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (_err) {
    // ignore
  }
  return [value];
};

export const getUploadFolder = (req) => req.s3Folder || "activities";

const buildObjectKey = (folder, originalName = "file") =>
  `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizeFileName(
    originalName
  )}`;

export const uploadGalleryFiles = async (files = [], folder = "uploads") =>
  Promise.all(
    files.map(async (file) => {
      const key = buildObjectKey(folder, file.originalname || "gallery");
      const uploaded = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype,
      });
      return {
        url: uploaded.url,
        key: uploaded.key,
        publicId: uploaded.key,
        type: file.mimetype?.startsWith("video") ? "video" : "image",
        storageProvider: "s3",
      };
    })
  );

export const uploadResourceFiles = async (files = [], folder = "uploads") =>
  Promise.all(
    files.map(async (file) => {
      const key = buildObjectKey(folder, file.originalname || "resource");
      const uploaded = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype,
      });
      return {
        url: uploaded.url,
        key: uploaded.key,
        publicId: uploaded.key,
        name: file.originalname || "",
        type: file.mimetype || "",
        storageProvider: "s3",
      };
    })
  );

export const uploadCoverImage = async (files, folder = "uploads") => {
  const cover = files?.[0];
  if (!cover) return undefined;
  const key = buildObjectKey(folder, cover.originalname || "cover");
  const uploaded = await uploadBufferToS3({
    buffer: cover.buffer,
    key,
    contentType: cover.mimetype,
  });
  return {
    url: uploaded.url,
    key: uploaded.key,
    publicId: uploaded.key,
    storageProvider: "s3",
  };
};

export const resolveActivityMedia = (activity) => {
  if (!activity) return activity;
  const entity = activity.toObject ? activity.toObject() : { ...activity };
  if (entity.coverImage) {
    entity.coverImage = {
      ...entity.coverImage,
      url: resolveMediaUrl({
        key: entity.coverImage.key,
        url: entity.coverImage.url,
        legacyUrl: entity.coverImage.url,
      }),
    };
  }
  entity.gallery = (entity.gallery || []).map((item) => ({
    ...item,
    url: resolveMediaUrl({
      key: item.key,
      url: item.url,
      legacyUrl: item.url,
    }),
  }));
  entity.resources = (entity.resources || []).map((item) => ({
    ...item,
    url: resolveMediaUrl({
      key: item.key,
      url: item.url,
      legacyUrl: item.url,
    }),
  }));
  return entity;
};
