import fs from "fs/promises";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Carrier from "../Models/Carrier.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidCarrierId,
  validateCarrierDocumentPayload,
  validateCarrierDriverPayload,
  validateCarrierDriverStatus,
  validateCarrierPayload,
  validateCarrierStatus,
} from "../validators/carrier.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set(["carrierName", "driversCount", "activeLoads", "status", "createdAt"]);

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

const normalizeCarrierPayload = (payload = {}) =>
  removeUndefined({
    carrierName: payload.carrierName?.trim(),
    logo: payload.logo?.trim(),
    phone: payload.phone?.trim(),
    email: payload.email?.trim().toLowerCase(),
    mcNumber: payload.mcNumber?.trim(),
    dotNumber: payload.dotNumber?.trim(),
    registrationNumber: payload.registrationNumber?.trim(),
    address: payload.address?.trim(),
    status: payload.status,
    driversCount: payload.driversCount !== undefined ? Number(payload.driversCount) : undefined,
    activeLoads: payload.activeLoads !== undefined ? Number(payload.activeLoads) : undefined,
    onTimeRate: payload.onTimeRate !== undefined ? Number(payload.onTimeRate) : undefined,
  });

const normalizeCarrierDocumentPayload = (payload = {}) =>
  removeUndefined({
    name: payload.name?.trim(),
    type: payload.type?.trim(),
    fileName: payload.fileName?.trim(),
    originalName: payload.originalName?.trim(),
    fileUrl: payload.fileUrl?.trim(),
    storage: payload.storage || "local",
    s3Key: payload.s3Key || null,
    bucket: payload.bucket || null,
    mimeType: payload.mimeType?.trim(),
    size: payload.size !== undefined ? Number(payload.size) : undefined,
    uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : new Date(),
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    status: payload.status?.trim() || "Valid",
    notes: payload.notes?.trim(),
  });

const normalizeCarrierDriverPayload = (payload = {}) =>
  removeUndefined({
    driverName: payload.driverName?.trim(),
    phone: payload.phone?.trim(),
    email: payload.email?.trim().toLowerCase(),
    loadNumber: payload.loadNumber?.trim(),
    pickup: payload.pickup?.trim(),
    delivery: payload.delivery?.trim(),
    assignedTruck: payload.assignedTruck?.trim(),
    truckType: payload.truckType?.trim(),
    deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : null,
    status: payload.status || "Active",
  });

const buildCarrierQuery = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { carrierName: regex },
      { phone: regex },
      { email: regex },
      { mcNumber: regex },
      { dotNumber: regex },
      { registrationNumber: regex },
      { status: regex },
    ];
  }

  return filter;
};

const findCarrierOrSend = async (id, res) => {
  if (!isValidCarrierId(id)) {
    sendError(res, "Invalid carrier id", 400);
    return null;
  }

  const carrier = await Carrier.findById(id);

  if (!carrier) {
    sendError(res, "Carrier not found", 404);
    return null;
  }

  return carrier;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

export const getCarriers = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const statusError = validateCarrierStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildCarrierQuery(req.query);

  const [carriers, total] = await Promise.all([
    Carrier.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Carrier.countDocuments(filter),
  ]);

  return sendSuccess(res, "Carriers fetched successfully", {
    carriers,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getCarrierById = asyncHandler(async (req, res) => {
  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  return sendSuccess(res, "Carrier fetched successfully", { carrier });
});

export const createCarrier = asyncHandler(async (req, res) => {
  const errors = validateCarrierPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const carrier = await Carrier.create({
    ...normalizeCarrierPayload(req.body),
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate mcNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Carrier created successfully", { carrier }, 201);
});

export const updateCarrier = asyncHandler(async (req, res) => {
  const errors = validateCarrierPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  Object.assign(carrier, normalizeCarrierPayload(req.body));
  await carrier.save();

  return sendSuccess(res, "Carrier updated successfully", { carrier });
});

export const deleteCarrier = asyncHandler(async (req, res) => {
  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  await carrier.deleteOne();

  return sendSuccess(res, "Carrier deleted successfully", {});
});

export const updateCarrierStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const statusError = validateCarrierStatus(status);
  if (statusError) return sendError(res, statusError, 400);

  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  carrier.status = status;
  await carrier.save();

  return sendSuccess(res, "Carrier status updated successfully", { carrier });
});

export const addCarrierDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const errors = validateCarrierDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }

  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) {
    await cleanupUploadedFile(req.file);
    return null;
  }

  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");

  carrier.documents.push(
    normalizeCarrierDocumentPayload({
      name: documentType,
      type: documentType,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: storedFile.fileUrl,
      storage: storedFile.storage,
      s3Key: storedFile.s3Key,
      bucket: storedFile.bucket,
      mimeType: req.file.mimetype,
      size: req.file.size,
      expiresAt: req.body.expiresAt,
      status: req.body.status,
      notes: req.body.notes,
    })
  );
  await carrier.save();

  return sendSuccess(res, "Carrier document added successfully", { carrier }, 201);
});

export const addCarrierDriver = asyncHandler(async (req, res) => {
  const errors = validateCarrierDriverPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  carrier.drivers.push(normalizeCarrierDriverPayload(req.body));
  carrier.driversCount = carrier.driversCount + 1;
  await carrier.save();

  return sendSuccess(res, "Carrier driver added successfully", { carrier }, 201);
});

export const updateCarrierDriverStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const statusError = validateCarrierDriverStatus(status);
  if (statusError) return sendError(res, statusError, 400);

  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  const driver = carrier.drivers.id(req.params.driverId);
  if (!driver) return sendError(res, "Carrier driver not found", 404);

  driver.status = status;
  await carrier.save();

  return sendSuccess(res, "Carrier driver status updated successfully", { carrier });
});

export const deleteCarrierDriver = asyncHandler(async (req, res) => {
  const carrier = await findCarrierOrSend(req.params.id, res);
  if (!carrier) return null;

  const driver = carrier.drivers.id(req.params.driverId);
  if (!driver) return sendError(res, "Carrier driver not found", 404);

  driver.deleteOne();
  carrier.driversCount = Math.max(0, carrier.driversCount - 1);
  await carrier.save();

  return sendSuccess(res, "Carrier driver deleted successfully", { carrier });
});
