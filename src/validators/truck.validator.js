import mongoose from "mongoose";

import { TRUCK_STATUSES, TRUCK_TRACKING_TYPES } from "../Models/Truck.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidTruckId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateTruckStatus = (status) => {
  if (!TRUCK_STATUSES.includes(status)) {
    return `Invalid status. Allowed statuses: ${TRUCK_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateTruckTrackingType = (trackingType) => {
  if (!TRUCK_TRACKING_TYPES.includes(trackingType)) {
    return `Invalid trackingType. Allowed tracking types: ${TRUCK_TRACKING_TYPES.join(", ")}`;
  }

  return null;
};

const normalizeEquipmentTypes = (equipmentTypes) => {
  if (Array.isArray(equipmentTypes)) return equipmentTypes;
  if (typeof equipmentTypes === "string") {
    return equipmentTypes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const validateTruckPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.driverName !== undefined) {
    if (!hasValue(payload.driverName)) errors.push("driverName is required");
  }

  if (!partial || payload.vehicleNumber !== undefined) {
    if (!hasValue(payload.vehicleNumber)) errors.push("vehicleNumber is required");
  }

  if (!partial || payload.equipmentTypes !== undefined) {
    const equipmentTypes = normalizeEquipmentTypes(payload.equipmentTypes);
    if (!equipmentTypes.length) errors.push("equipmentTypes must not be empty");
  }

  if (!partial || payload.trackingType !== undefined) {
    if (!hasValue(payload.trackingType)) {
      errors.push("trackingType is required");
    } else {
      const trackingTypeError = validateTruckTrackingType(payload.trackingType);
      if (trackingTypeError) errors.push(trackingTypeError);
    }
  }

  if (!partial || payload.status !== undefined) {
    if (!hasValue(payload.status)) {
      errors.push("status is required");
    } else {
      const statusError = validateTruckStatus(payload.status);
      if (statusError) errors.push(statusError);
    }
  }

  if (hasValue(payload.email) && !emailPattern.test(String(payload.email).trim())) {
    errors.push("email must be valid");
  }

  for (const key of ["activeLoads", "completedLoads", "onTimeRate", "totalRevenue"]) {
    if (payload[key] !== undefined && !Number.isFinite(Number(payload[key]))) {
      errors.push(`${key} must be a number`);
    }
  }

  return errors;
};

export const validateTruckDocumentPayload = (payload = {}) => {
  const errors = [];

  if (!hasValue(payload.documentType)) errors.push("documentType is required");

  return errors;
};
