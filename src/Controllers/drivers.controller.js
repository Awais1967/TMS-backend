import fs from "fs/promises";
import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Driver from "../Models/Driver.js";
import Truck from "../Models/Truck.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidDriverId,
  validateDriverDocumentPayload,
  validateDriverPayload,
  validateDriverStatus,
} from "../validators/driver.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set([
  "driverName",
  "assignedLoads",
  "availabilityStatus",
  "licenseExpiry",
  "createdAt",
]);

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

export const calculateLicenseAlert = (licenseExpiry) => {
  const expiry = new Date(licenseExpiry);
  if (Number.isNaN(expiry.getTime())) return false;

  const now = new Date();
  const alertUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  return expiry <= alertUntil;
};

const normalizeDriverPayload = (payload = {}) =>
  removeUndefined({
    driverName: payload.driverName?.trim(),
    avatar: payload.avatar?.trim(),
    phone: payload.phone?.trim(),
    email: payload.email?.trim().toLowerCase(),
    licenseNumber: payload.licenseNumber?.trim(),
    licenseExpiry: payload.licenseExpiry ? new Date(payload.licenseExpiry) : undefined,
    assignedTruck: payload.assignedTruck?.trim(),
    truckType: payload.truckType?.trim(),
    assignedLoads: payload.assignedLoads !== undefined ? Number(payload.assignedLoads) : undefined,
    availabilityStatus: payload.availabilityStatus,
    liveLocation: payload.liveLocation?.trim(),
    completedLoads: payload.completedLoads !== undefined ? Number(payload.completedLoads) : undefined,
    onTimeRate: payload.onTimeRate !== undefined ? Number(payload.onTimeRate) : undefined,
    totalMiles: payload.totalMiles !== undefined ? Number(payload.totalMiles) : undefined,
    eta: payload.eta?.trim(),
    assignedTruckDetails: payload.assignedTruckDetails,
    assignedLoadDetails: payload.assignedLoadDetails,
    documents: payload.documents,
    recentActivity: payload.recentActivity,
    performanceSummary: payload.performanceSummary,
  });

const normalizeDriverDocumentPayload = (payload = {}) =>
  removeUndefined({
    name: payload.name?.trim(),
    fileName: payload.fileName?.trim(),
    originalName: payload.originalName?.trim(),
    type: payload.type?.trim(),
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

const buildDriverQuery = (query) => {
  const filter = {};

  if (query.status) filter.availabilityStatus = query.status;

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { driverName: regex },
      { phone: regex },
      { email: regex },
      { licenseNumber: regex },
      { assignedTruck: regex },
      { liveLocation: regex },
      { availabilityStatus: regex },
    ];
  }

  return filter;
};

const findDriverOrSend = async (id, res) => {
  if (!isValidDriverId(id)) {
    sendError(res, "Invalid driver id", 400);
    return null;
  }

  const driver = await Driver.findById(id);

  if (!driver) {
    sendError(res, "Driver not found", 404);
    return null;
  }

  return driver;
};

const cleanString = (value) => String(value || "").trim();

const getTruckDisplayNumber = (truck) =>
  cleanString(truck?.truckNumber) ||
  cleanString(truck?.vehicleNumber) ||
  cleanString(truck?.licensePlate);

const findTruckForReassign = async ({ truckId, truckNumber }) => {
  const cleanTruckId = cleanString(truckId);
  const cleanTruckNumber = cleanString(truckNumber);

  if (cleanTruckId && mongoose.Types.ObjectId.isValid(cleanTruckId)) {
    const truck = await Truck.findById(cleanTruckId);
    if (truck) return truck;
  }

  if (!cleanTruckNumber) return null;

  return Truck.findOne({
    $or: [
      { vehicleNumber: cleanTruckNumber },
      { truckNumber: cleanTruckNumber },
      { licensePlate: cleanTruckNumber },
    ],
  });
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

export const getDrivers = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const statusError = validateDriverStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildDriverQuery(req.query);

  const [drivers, total] = await Promise.all([
    Driver.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Driver.countDocuments(filter),
  ]);

  return sendSuccess(res, "Drivers fetched successfully", {
    drivers,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getDriverById = asyncHandler(async (req, res) => {
  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  return sendSuccess(res, "Driver fetched successfully", { driver });
});

export const createDriver = asyncHandler(async (req, res) => {
  const errors = validateDriverPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const payload = normalizeDriverPayload(req.body);
  payload.licenseAlert = calculateLicenseAlert(payload.licenseExpiry);

  const driver = await Driver.create({
    ...payload,
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate licenseNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Driver created successfully", { driver }, 201);
});

export const updateDriver = asyncHandler(async (req, res) => {
  const errors = validateDriverPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  const payload = normalizeDriverPayload(req.body);
  if (payload.licenseExpiry !== undefined) {
    payload.licenseAlert = calculateLicenseAlert(payload.licenseExpiry);
  }

  Object.assign(driver, payload);
  await driver.save();

  return sendSuccess(res, "Driver updated successfully", { driver });
});

export const deleteDriver = asyncHandler(async (req, res) => {
  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  await driver.deleteOne();

  return sendSuccess(res, "Driver deleted successfully", {});
});

export const updateDriverStatus = asyncHandler(async (req, res) => {
  const availabilityStatus = req.body?.availabilityStatus;
  const statusError = validateDriverStatus(availabilityStatus);
  if (statusError) return sendError(res, statusError, 400);

  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  driver.availabilityStatus = availabilityStatus;
  await driver.save();

  return sendSuccess(res, "Driver status updated successfully", { driver });
});

export const reassignDriverTruck = asyncHandler(async (req, res) => {
  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  const requestedTruckNumber =
    cleanString(req.body?.truckNumber) ||
    cleanString(req.body?.vehicleNumber) ||
    cleanString(req.body?.assignedTruck);
  const truck = await findTruckForReassign({
    truckId: req.body?.truckId,
    truckNumber: requestedTruckNumber,
  });

  if (!truck) return sendError(res, "Truck not found", 404);

  const previousTruckNumber = cleanString(driver.assignedTruck);
  const truckNumber = getTruckDisplayNumber(truck);
  const truckType = cleanString(truck.truckType) || truck.equipmentTypes?.[0] || cleanString(req.body?.truckType);

  if (!truckNumber) return sendError(res, "Truck number is missing", 400);

  if (previousTruckNumber && previousTruckNumber !== truckNumber) {
    await Truck.updateOne(
      {
        $or: [
          { vehicleNumber: previousTruckNumber },
          { truckNumber: previousTruckNumber },
          { licensePlate: previousTruckNumber },
        ],
      },
      {
        $set: {
          driverName: "Unassigned",
          contactPerson: "",
          phone: "",
          email: "",
        },
      }
    );
  }

  driver.assignedTruck = truckNumber;
  driver.truckType = truckType;
  driver.assignedTruckDetails = {
    truckId: String(truck._id),
    truckType,
    trailerType: truckType,
    licensePlate: cleanString(truck.licensePlate),
    status: cleanString(truck.status),
  };

  truck.driverName = driver.driverName;
  truck.contactPerson = driver.driverName;
  truck.phone = driver.phone;
  truck.email = driver.email;

  await Promise.all([driver.save(), truck.save()]);

  return sendSuccess(res, "Driver truck reassigned successfully", { driver });
});

export const addDriverDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const errors = validateDriverDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }

  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) {
    await cleanupUploadedFile(req.file);
    return null;
  }

  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");

  driver.documents.push(
    normalizeDriverDocumentPayload({
      name: documentType,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      type: documentType,
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
  await driver.save();

  return sendSuccess(res, "Driver document added successfully", { driver }, 201);
});

export const deleteDriverDocument = asyncHandler(async (req, res) => {
  const driver = await findDriverOrSend(req.params.id, res);
  if (!driver) return null;

  const document = driver.documents.id(req.params.documentId);
  if (!document) return sendError(res, "Driver document not found", 404);

  document.deleteOne();
  await driver.save();

  return sendSuccess(res, "Driver document deleted successfully", { driver });
});
