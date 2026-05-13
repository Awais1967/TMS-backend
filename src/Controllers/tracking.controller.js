import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Load from "../Models/Load.js";
import Tracking, { TRACKING_STATUSES, TRACKING_TYPES } from "../Models/Tracking.js";
import Truck from "../Models/Truck.js";
import {
  isValidTrackingId,
  validateRouteProgress,
  validateTrackingPayload,
  validateTrackingStatus,
  validateTrackingType,
} from "../validators/tracking.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set([
  "truckId",
  "driverName",
  "status",
  "routeProgress",
  "lastUpdate",
  "createdAt",
]);

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

const loadNumberCandidates = (loadNumber = "") => {
  const value = String(loadNumber || "").trim();
  if (!value) return [];
  const withoutHash = value.replace(/^#/, "");
  return [...new Set([value, withoutHash, `#${withoutHash}`])];
};

const normalizeTrackingPayload = (payload = {}) =>
  removeUndefined({
    truckId: payload.truckId?.trim(),
    driverName: payload.driverName?.trim(),
    driverPhone: payload.driverPhone?.trim(),
    loadId: payload.loadId?.trim(),
    currentLocation: payload.currentLocation?.trim(),
    eta: payload.eta?.trim(),
    speed: payload.speed !== undefined ? Number(payload.speed) : undefined,
    status: payload.status,
    trackingType: payload.trackingType,
    routeProgress: payload.routeProgress !== undefined ? Number(payload.routeProgress) : undefined,
    pickup: payload.pickup?.trim(),
    delivery: payload.delivery?.trim(),
    distance: payload.distance?.trim(),
    mapPoints: payload.mapPoints,
    notes: payload.notes?.trim(),
  });

const buildTrackingQuery = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.trackingType) filter.trackingType = query.trackingType;
  if (query.truckId) filter.truckId = { $regex: escapeRegex(query.truckId), $options: "i" };
  if (query.loadId) filter.loadId = { $regex: escapeRegex(query.loadId), $options: "i" };
  if (query.driverName) filter.driverName = { $regex: escapeRegex(query.driverName), $options: "i" };
  if (query.location) filter.currentLocation = { $regex: escapeRegex(query.location), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { truckId: regex },
      { driverName: regex },
      { loadId: regex },
      { currentLocation: regex },
      { pickup: regex },
      { delivery: regex },
      { status: regex },
      { trackingType: regex },
    ];
  }

  return filter;
};

const findTrackingByTruckIdOrMongoId = async (idOrTruckId) => {
  if (isValidTrackingId(idOrTruckId)) {
    const byId = await Tracking.findById(idOrTruckId);
    if (byId) return byId;
  }

  return Tracking.findOne({ truckId: idOrTruckId });
};

const linkTruckAndLoad = async (payload) => {
  const [truck, load] = await Promise.all([
    payload.truckId ? Truck.findOne({ vehicleNumber: payload.truckId }) : null,
    payload.loadId ? Load.findOne({ loadNumber: { $in: loadNumberCandidates(payload.loadId) } }) : null,
  ]);

  return {
    truck: truck?._id || null,
    load: load?._id || null,
  };
};

export const getTrackingRecords = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const statusError = validateTrackingStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  if (req.query.trackingType) {
    const trackingTypeError = validateTrackingType(req.query.trackingType);
    if (trackingTypeError) return sendError(res, trackingTypeError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "lastUpdate");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "lastUpdate";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildTrackingQuery(req.query);

  const [tracking, total, onTime, delayed, critical] = await Promise.all([
    Tracking.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Tracking.countDocuments(filter),
    Tracking.countDocuments({ status: "On Time" }),
    Tracking.countDocuments({ status: "Delayed" }),
    Tracking.countDocuments({ status: "Critical" }),
  ]);

  return sendSuccess(res, "Tracking records fetched successfully", {
    tracking,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    stats: {
      onTime,
      delayed,
      critical,
      total: onTime + delayed + critical,
    },
  });
});

export const getTrackingByTruckId = asyncHandler(async (req, res) => {
  const tracking = await findTrackingByTruckIdOrMongoId(req.params.truckId);

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  return sendSuccess(res, "Tracking record fetched successfully", { tracking });
});

export const createTrackingRecord = asyncHandler(async (req, res) => {
  const errors = validateTrackingPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const payload = normalizeTrackingPayload(req.body);
  const links = await linkTruckAndLoad(payload);

  const tracking = await Tracking.create({
    ...payload,
    ...links,
    lastUpdate: new Date(),
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate active tracking for truckId";
    }
    throw error;
  });

  return sendSuccess(res, "Tracking record created successfully", { tracking }, 201);
});

export const updateTrackingRecord = asyncHandler(async (req, res) => {
  if (!isValidTrackingId(req.params.id)) {
    return sendError(res, "Invalid tracking id", 400);
  }

  const errors = validateTrackingPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const payload = normalizeTrackingPayload(req.body);
  const links = await linkTruckAndLoad(payload);

  const tracking = await Tracking.findByIdAndUpdate(
    req.params.id,
    {
      ...payload,
      ...(payload.truckId || payload.loadId ? links : {}),
      lastUpdate: new Date(),
    },
    { new: true, runValidators: true }
  ).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate active tracking for truckId";
    }
    throw error;
  });

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  return sendSuccess(res, "Tracking record updated successfully", { tracking });
});

export const updateTrackingLocation = asyncHandler(async (req, res) => {
  const tracking = await Tracking.findOne({ truckId: req.params.truckId });

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  if (!req.body?.currentLocation) {
    return sendError(res, "currentLocation is required", 400);
  }

  if (req.body.speed !== undefined && !Number.isFinite(Number(req.body.speed))) {
    return sendError(res, "speed must be a number", 400);
  }

  tracking.currentLocation = String(req.body.currentLocation).trim();

  if (req.body.speed !== undefined) tracking.speed = Number(req.body.speed);
  if (req.body.eta !== undefined) tracking.eta = String(req.body.eta || "").trim();
  if (req.body.mapPoints && typeof req.body.mapPoints === "object") {
    tracking.mapPoints = {
      ...tracking.mapPoints?.toObject?.(),
      ...req.body.mapPoints,
    };
  }

  tracking.lastUpdate = new Date();
  await tracking.save();

  return sendSuccess(res, "Tracking location updated successfully", { tracking });
});

export const updateTrackingStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const statusError = validateTrackingStatus(status);
  if (statusError) return sendError(res, statusError, 400);

  const tracking = await Tracking.findOneAndUpdate(
    { truckId: req.params.truckId },
    { status, lastUpdate: new Date() },
    { new: true, runValidators: true }
  );

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  return sendSuccess(res, "Tracking status updated successfully", { tracking });
});

export const updateTrackingProgress = asyncHandler(async (req, res) => {
  const routeProgressError = validateRouteProgress(req.body?.routeProgress);
  if (routeProgressError) return sendError(res, routeProgressError, 400);

  const update = {
    routeProgress: Number(req.body.routeProgress),
    lastUpdate: new Date(),
  };

  if (req.body.eta !== undefined) update.eta = String(req.body.eta || "").trim();
  if (req.body.distance !== undefined) update.distance = String(req.body.distance || "").trim();

  const tracking = await Tracking.findOneAndUpdate(
    { truckId: req.params.truckId },
    update,
    { new: true, runValidators: true }
  );

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  return sendSuccess(res, "Tracking progress updated successfully", { tracking });
});

export const deleteTrackingRecord = asyncHandler(async (req, res) => {
  if (!isValidTrackingId(req.params.id)) {
    return sendError(res, "Invalid tracking id", 400);
  }

  const tracking = await Tracking.findByIdAndDelete(req.params.id);

  if (!tracking) {
    return sendError(res, "Tracking record not found", 404);
  }

  return sendSuccess(res, "Tracking record deleted successfully", {});
});
