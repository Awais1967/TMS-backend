import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Load from "../Models/Load.js";
import {
  isValidLoadId,
  validateCreateLoad,
  validateLoadStatus,
  validateUpdateLoad,
} from "../validators/load.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

const normalizeLoadPayload = (payload = {}) =>
  removeUndefined({
    ...payload,
    customerName: payload.customerName?.trim(),
    customerAvatar: payload.customerAvatar?.trim(),
    commodity: payload.commodity?.trim(),
    weight: payload.weight !== undefined ? Number(payload.weight) : undefined,
    pickup: payload.pickup,
    delivery: payload.delivery,
    carrierName: payload.carrierName?.trim(),
    driverName: payload.driverName?.trim(),
    truckNumber: payload.truckNumber?.trim(),
    rate: payload.rate !== undefined ? Number(payload.rate) : undefined,
    additionalCharges:
      payload.additionalCharges !== undefined ? Number(payload.additionalCharges) : undefined,
    eta: payload.eta?.trim(),
    mapImage: payload.mapImage?.trim(),
  });

const buildLoadNumber = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LD-${yyyy}${mm}${dd}-${random}`;
};

const generateLoadNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const loadNumber = buildLoadNumber();
    const exists = await Load.exists({ loadNumber });
    if (!exists) return loadNumber;
  }

  return `LD-${Date.now()}`;
};

const findLoadByIdOrNumber = async (idOrNumber) => {
  if (isValidLoadId(idOrNumber)) {
    return Load.findById(idOrNumber);
  }

  return Load.findOne({ loadNumber: idOrNumber });
};

const buildLoadQuery = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.customerName) filter.customerName = { $regex: escapeRegex(query.customerName), $options: "i" };
  if (query.carrierName) filter.carrierName = { $regex: escapeRegex(query.carrierName), $options: "i" };
  if (query.pickupCity) filter["pickup.city"] = { $regex: escapeRegex(query.pickupCity), $options: "i" };
  if (query.deliveryCity) filter["delivery.city"] = { $regex: escapeRegex(query.deliveryCity), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { loadNumber: regex },
      { customerName: regex },
      { carrierName: regex },
      { driverName: regex },
      { truckNumber: regex },
      { "pickup.city": regex },
      { "delivery.city": regex },
      { status: regex },
    ];
  }

  return filter;
};

export const getLoads = asyncHandler(async (req, res) => {
  if (req.query.status) {
    const statusError = validateLoadStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const sortBy = String(req.query.sortBy || "createdAt");
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildLoadQuery(req.query);

  const [loads, total] = await Promise.all([
    Load.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Load.countDocuments(filter),
  ]);

  return sendSuccess(res, "Loads fetched successfully", {
    loads,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getLoadById = asyncHandler(async (req, res) => {
  const load = await findLoadByIdOrNumber(req.params.id);

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  return sendSuccess(res, "Load fetched successfully", { load });
});

export const createLoad = asyncHandler(async (req, res) => {
  const errors = validateCreateLoad(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const payload = normalizeLoadPayload(req.body);
  const loadNumber = payload.loadNumber?.trim() || (await generateLoadNumber());

  const load = await Load.create({
    ...payload,
    loadNumber,
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate loadNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Load created successfully", { load }, 201);
});

export const updateLoad = asyncHandler(async (req, res) => {
  const errors = validateUpdateLoad(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const load = await findLoadByIdOrNumber(req.params.id);

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  Object.assign(load, normalizeLoadPayload(req.body));
  await load.save();

  return sendSuccess(res, "Load updated successfully", { load });
});

export const deleteLoad = asyncHandler(async (req, res) => {
  const load = await findLoadByIdOrNumber(req.params.id);

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  await load.deleteOne();

  return sendSuccess(res, "Load deleted successfully", {});
});

export const updateLoadStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const statusError = validateLoadStatus(status);

  if (statusError) {
    return sendError(res, statusError, 400);
  }

  const query = isValidLoadId(req.params.id)
    ? { _id: new mongoose.Types.ObjectId(req.params.id) }
    : { loadNumber: req.params.id };

  const load = await Load.findOneAndUpdate(query, { status }, { new: true, runValidators: true });

  if (!load) {
    return sendError(res, "Load not found", 404);
  }

  return sendSuccess(res, "Load status updated successfully", { load });
});
