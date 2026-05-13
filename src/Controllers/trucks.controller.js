import fs from "fs/promises";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Truck from "../Models/Truck.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidTruckId,
  validateTruckDocumentPayload,
  validateTruckPayload,
  validateTruckStatus,
  validateTruckTrackingType,
} from "../validators/truck.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set(["vehicleNumber", "activeLoads", "onTimeRate", "status", "createdAt"]);

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

const normalizeEquipmentTypes = (equipmentTypes) => {
  if (Array.isArray(equipmentTypes)) {
    return equipmentTypes.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof equipmentTypes === "string") {
    return equipmentTypes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

const normalizeTruckPayload = (payload = {}) =>
  removeUndefined({
    driverName: payload.driverName?.trim(),
    driverAvatar: payload.driverAvatar?.trim(),
    phone: payload.phone?.trim(),
    email: payload.email?.trim().toLowerCase(),
    vehicleNumber: payload.vehicleNumber?.trim(),
    equipmentTypes: payload.equipmentTypes !== undefined ? normalizeEquipmentTypes(payload.equipmentTypes) : undefined,
    activeLoads: payload.activeLoads !== undefined ? Number(payload.activeLoads) : undefined,
    completedLoads: payload.completedLoads !== undefined ? Number(payload.completedLoads) : undefined,
    onTimeRate: payload.onTimeRate !== undefined ? Number(payload.onTimeRate) : undefined,
    totalRevenue: payload.totalRevenue !== undefined ? Number(payload.totalRevenue) : undefined,
    trackingType: payload.trackingType,
    status: payload.status,
    truckType: payload.truckType?.trim(),
    contactPerson: payload.contactPerson?.trim(),
    address: payload.address?.trim(),
    currentLocation: payload.currentLocation?.trim(),
    licensePlate: payload.licensePlate?.trim(),
    assignedLoads: payload.assignedLoads,
    performanceData: payload.performanceData,
    trackingConfig: payload.trackingConfig,
  });

const normalizeTruckDocumentPayload = (payload = {}) =>
  removeUndefined({
    name: payload.name?.trim(),
    documentType: payload.documentType?.trim(),
    originalName: payload.originalName?.trim(),
    fileName: payload.fileName?.trim(),
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

const buildTruckQuery = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.trackingType) filter.trackingType = query.trackingType;
  if (query.equipmentType) filter.equipmentTypes = query.equipmentType;

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { driverName: regex },
      { phone: regex },
      { email: regex },
      { vehicleNumber: regex },
      { trackingType: regex },
      { status: regex },
      { truckType: regex },
      { currentLocation: regex },
      { equipmentTypes: regex },
    ];
  }

  return filter;
};

const findTruckOrSend = async (id, res) => {
  if (!isValidTruckId(id)) {
    sendError(res, "Invalid truck id", 400);
    return null;
  }

  const truck = await Truck.findById(id);

  if (!truck) {
    sendError(res, "Truck not found", 404);
    return null;
  }

  return truck;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

export const getTrucks = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const statusError = validateTruckStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  if (req.query.trackingType) {
    const trackingTypeError = validateTruckTrackingType(req.query.trackingType);
    if (trackingTypeError) return sendError(res, trackingTypeError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildTruckQuery(req.query);

  const [trucks, total] = await Promise.all([
    Truck.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Truck.countDocuments(filter),
  ]);

  return sendSuccess(res, "Trucks fetched successfully", {
    trucks,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getTruckById = asyncHandler(async (req, res) => {
  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  return sendSuccess(res, "Truck fetched successfully", { truck });
});

export const createTruck = asyncHandler(async (req, res) => {
  const errors = validateTruckPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const truck = await Truck.create({
    ...normalizeTruckPayload(req.body),
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate vehicleNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Truck created successfully", { truck }, 201);
});

export const updateTruck = asyncHandler(async (req, res) => {
  const errors = validateTruckPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  Object.assign(truck, normalizeTruckPayload(req.body));
  await truck.save();

  return sendSuccess(res, "Truck updated successfully", { truck });
});

export const deleteTruck = asyncHandler(async (req, res) => {
  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  await truck.deleteOne();

  return sendSuccess(res, "Truck deleted successfully", {});
});

export const updateTruckStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const statusError = validateTruckStatus(status);
  if (statusError) return sendError(res, statusError, 400);

  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  truck.status = status;
  await truck.save();

  return sendSuccess(res, "Truck status updated successfully", { truck });
});

export const updateTruckTracking = asyncHandler(async (req, res) => {
  const trackingType = req.body?.trackingType;
  const trackingTypeError = validateTruckTrackingType(trackingType);
  if (trackingTypeError) return sendError(res, trackingTypeError, 400);

  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  truck.trackingType = trackingType;

  if (req.body?.trackingConfig && typeof req.body.trackingConfig === "object") {
    truck.trackingConfig = req.body.trackingConfig;
  } else {
    truck.trackingConfig = {
      type: trackingType,
      description: "",
      enabled: true,
    };
  }

  await truck.save();

  return sendSuccess(res, "Truck tracking updated successfully", { truck });
});

export const addTruckDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const errors = validateTruckDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }

  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) {
    await cleanupUploadedFile(req.file);
    return null;
  }

  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");

  truck.documents.push(
    normalizeTruckDocumentPayload({
      name: documentType,
      documentType,
      originalName: req.file.originalname,
      fileName: req.file.filename,
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
  await truck.save();

  return sendSuccess(res, "Truck document added successfully", { truck }, 201);
});

export const deleteTruckDocument = asyncHandler(async (req, res) => {
  const truck = await findTruckOrSend(req.params.id, res);
  if (!truck) return null;

  const document = truck.documents.id(req.params.documentId);
  if (!document) return sendError(res, "Truck document not found", 404);

  document.deleteOne();
  await truck.save();

  return sendSuccess(res, "Truck document deleted successfully", { truck });
});
