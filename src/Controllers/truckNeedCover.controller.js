import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Load, { LOAD_PRIORITIES } from "../Models/Load.js";
import Truck from "../Models/Truck.js";
import { TRUCK_STATUSES, TRUCK_TRACKING_TYPES } from "../Models/Truck.js";

const DEFAULT_MAX_ACTIVE_LOADS = 2;

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const allowedLoadSortFields = new Set(["createdAt", "priority", "coverStatus", "loadNumber", "rate", "totalCost"]);

const buildNeedCoverBaseFilter = () => ({
  $or: [
    { status: "Open" },
    { truckNumber: { $in: ["", null] } },
    { driverName: { $in: ["", null] } },
    { carrierName: { $in: ["", null] } },
    { coverStatus: "Need Cover" },
  ],
});

const buildNeedCoverQuery = (query) => {
  const filter = buildNeedCoverBaseFilter();
  const andFilters = [];

  if (query.status) andFilters.push({ status: query.status });
  if (query.priority) andFilters.push({ priority: query.priority });
  if (query.requiredEquipment) {
    andFilters.push({ requiredEquipment: { $regex: `^${escapeRegex(query.requiredEquipment)}$`, $options: "i" } });
  }
  if (query.pickupCity) {
    andFilters.push({ "pickup.city": { $regex: escapeRegex(query.pickupCity), $options: "i" } });
  }
  if (query.deliveryCity) {
    andFilters.push({ "delivery.city": { $regex: escapeRegex(query.deliveryCity), $options: "i" } });
  }

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    andFilters.push({
      $or: [
        { loadNumber: regex },
        { customerName: regex },
        { commodity: regex },
        { "pickup.city": regex },
        { "delivery.city": regex },
        { carrierName: regex },
        { driverName: regex },
        { truckNumber: regex },
        { requiredEquipment: regex },
        { coverStatus: regex },
        { priority: regex },
      ],
    });
  }

  if (andFilters.length) {
    return { $and: [filter, ...andFilters] };
  }

  return filter;
};

const buildAvailableTruckQuery = (query = {}) => {
  const filter = {
    status: query.status || "Active",
    driverName: { $nin: ["", null] },
    activeLoads: { $lt: DEFAULT_MAX_ACTIVE_LOADS },
  };

  if (query.status && !TRUCK_STATUSES.includes(query.status)) {
    return { filter, error: `Invalid status. Allowed statuses: ${TRUCK_STATUSES.join(", ")}` };
  }

  if (query.trackingType) {
    if (!TRUCK_TRACKING_TYPES.includes(query.trackingType)) {
      return {
        filter,
        error: `Invalid trackingType. Allowed tracking types: ${TRUCK_TRACKING_TYPES.join(", ")}`,
      };
    }
    filter.trackingType = query.trackingType;
  }

  if (query.equipmentType) {
    filter.equipmentTypes = { $regex: `^${escapeRegex(query.equipmentType)}$`, $options: "i" };
  }

  if (query.location) {
    filter.currentLocation = { $regex: escapeRegex(query.location), $options: "i" };
  }

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { vehicleNumber: regex },
      { driverName: regex },
      { equipmentTypes: regex },
      { trackingType: regex },
      { currentLocation: regex },
      { status: regex },
    ];
  }

  return { filter, error: null };
};

const validatePriority = (priority) => {
  if (!LOAD_PRIORITIES.includes(priority)) {
    return `Invalid priority. Allowed priorities: ${LOAD_PRIORITIES.join(", ")}`;
  }

  return null;
};

const isTruckAvailable = (truck) =>
  truck?.status === "Active" &&
  String(truck.driverName || "").trim() &&
  Number(truck.activeLoads || 0) < DEFAULT_MAX_ACTIVE_LOADS;

const getRecommendedTrucks = async (requiredEquipment = "") => {
  const { filter } = buildAvailableTruckQuery({
    equipmentType: requiredEquipment || undefined,
  });

  return Truck.find(filter)
    .sort({ onTimeRate: -1, activeLoads: 1 })
    .limit(10)
    .select("vehicleNumber driverName phone email equipmentTypes trackingType status currentLocation activeLoads onTimeRate truckType licensePlate")
    .lean();
};

const loadSelect =
  "loadNumber customerName commodity weight pickup delivery status coverStatus priority requiredEquipment rate totalCost carrierName driverName truckNumber assignment createdAt";

export const getTruckNeedCoverLoads = asyncHandler(async (req, res) => {
  if (req.query.priority) {
    const priorityError = validatePriority(req.query.priority);
    if (priorityError) return sendError(res, priorityError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedLoadSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildNeedCoverQuery(req.query);
  const availableTruckQuery = buildAvailableTruckQuery({ status: "Active" }).filter;

  const [loads, total, needCover, covered, critical, availableTrucks] = await Promise.all([
    Load.find(filter).select(loadSelect).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Load.countDocuments(filter),
    Load.countDocuments({ coverStatus: "Need Cover" }),
    Load.countDocuments({ coverStatus: { $in: ["Covered", "Assigned"] } }),
    Load.countDocuments({ ...buildNeedCoverBaseFilter(), priority: "Critical" }),
    Truck.countDocuments(availableTruckQuery),
  ]);

  return sendSuccess(res, "Truck need cover loads fetched successfully", {
    loads,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    stats: {
      needCover,
      covered,
      critical,
      availableTrucks,
    },
  });
});

export const getAvailableTrucks = asyncHandler(async (req, res) => {
  const { filter, error } = buildAvailableTruckQuery(req.query);
  if (error) return sendError(res, error, 400);

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;

  const [trucks, total] = await Promise.all([
    Truck.find(filter)
      .select("vehicleNumber driverName phone email equipmentTypes trackingType status currentLocation activeLoads onTimeRate truckType licensePlate")
      .sort({ onTimeRate: -1, activeLoads: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Truck.countDocuments(filter),
  ]);

  return sendSuccess(res, "Available trucks fetched successfully", {
    trucks,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getTruckNeedCoverLoadById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.loadId)) {
    return sendError(res, "Invalid load id", 400);
  }

  const load = await Load.findById(req.params.loadId).select(loadSelect).lean();

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  const recommendedTrucks = await getRecommendedTrucks(load.requiredEquipment);

  return sendSuccess(res, "Truck need cover load fetched successfully", {
    load,
    recommendedTrucks,
  });
});

export const assignTruckToLoad = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.loadId)) {
    return sendError(res, "Invalid load id", 400);
  }

  if (!isValidObjectId(req.body?.truckId)) {
    return sendError(res, "Invalid truckId", 400);
  }

  const force = String(req.query.force || "").toLowerCase() === "true";
  const [load, truck] = await Promise.all([
    Load.findById(req.params.loadId),
    Truck.findById(req.body.truckId),
  ]);

  if (!load) return sendError(res, "Load not found", 404);
  if (!truck) return sendError(res, "Truck not found", 404);

  const alreadyCovered = ["Covered", "Assigned"].includes(load.coverStatus) || Boolean(load.assignment?.truckId);
  if (alreadyCovered && !force) {
    return sendError(res, "Load is already covered. Use force=true to replace assignment.", 400);
  }

  const oldTruckId = load.assignment?.truckId;
  const isSameTruckAssignment = oldTruckId && String(oldTruckId) === String(truck._id);

  if (!isSameTruckAssignment && !isTruckAvailable(truck)) {
    return sendError(res, "Truck is not available for assignment", 400);
  }

  if (force && oldTruckId && !isSameTruckAssignment) {
    await Truck.findOneAndUpdate({ _id: oldTruckId, activeLoads: { $gt: 0 } }, { $inc: { activeLoads: -1 } });
  }

  const carrierName = String(req.body?.carrierName || load.carrierName || truck.contactPerson || "").trim();

  load.truckNumber = truck.vehicleNumber;
  load.driverName = truck.driverName;
  load.carrierName = carrierName;
  load.status = "Assigned";
  load.coverStatus = "Covered";
  load.assignment = {
    truckId: truck._id,
    truckNumber: truck.vehicleNumber,
    driverName: truck.driverName,
    carrierName,
    assignedAt: new Date(),
    assignedBy: req.user?._id || null,
  };

  if (!isSameTruckAssignment) {
    truck.activeLoads = Number(truck.activeLoads || 0) + 1;
  }

  await Promise.all([load.save(), truck.save()]);

  return sendSuccess(res, "Truck assigned successfully", { load, truck });
});

export const unassignTruckFromLoad = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.loadId)) {
    return sendError(res, "Invalid load id", 400);
  }

  const load = await Load.findById(req.params.loadId);

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  if (load.assignment?.truckId) {
    const truck = await Truck.findById(load.assignment.truckId);
    if (truck && Number(truck.activeLoads || 0) > 0) {
      truck.activeLoads = Number(truck.activeLoads || 0) - 1;
      await truck.save();
    }
  }

  load.truckNumber = "";
  load.driverName = "";
  load.assignment = {};
  load.coverStatus = "Need Cover";
  load.status = "Open";
  await load.save();

  return sendSuccess(res, "Truck unassigned successfully", { load });
});

export const updateLoadPriority = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.loadId)) {
    return sendError(res, "Invalid load id", 400);
  }

  const priority = String(req.body?.priority || "").trim();
  const priorityError = validatePriority(priority);
  if (priorityError) return sendError(res, priorityError, 400);

  const load = await Load.findByIdAndUpdate(
    req.params.loadId,
    { priority },
    { new: true, runValidators: true }
  );

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  return sendSuccess(res, "Load priority updated successfully", { load });
});
