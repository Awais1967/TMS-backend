import mongoose from "mongoose";

import { TRACKING_STATUSES, TRACKING_TYPES } from "../Models/Tracking.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const isValidTrackingId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateTrackingStatus = (status) => {
  if (!TRACKING_STATUSES.includes(status)) {
    return `Invalid status. Allowed statuses: ${TRACKING_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateTrackingType = (trackingType) => {
  if (!TRACKING_TYPES.includes(trackingType)) {
    return `Invalid trackingType. Allowed tracking types: ${TRACKING_TYPES.join(", ")}`;
  }

  return null;
};

export const validateRouteProgress = (routeProgress) => {
  const progress = toNumber(routeProgress);

  if (progress === null || progress < 0 || progress > 100) {
    return "routeProgress must be a number between 0 and 100";
  }

  return null;
};

export const validateTrackingPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.truckId !== undefined) {
    if (!hasValue(payload.truckId)) errors.push("truckId is required");
  }

  if (!partial || payload.driverName !== undefined) {
    if (!hasValue(payload.driverName)) errors.push("driverName is required");
  }

  if (!partial || payload.loadId !== undefined) {
    if (!hasValue(payload.loadId)) errors.push("loadId is required");
  }

  if (!partial || payload.currentLocation !== undefined) {
    if (!hasValue(payload.currentLocation)) errors.push("currentLocation is required");
  }

  if (!partial || payload.status !== undefined) {
    if (!hasValue(payload.status)) {
      errors.push("status is required");
    } else {
      const statusError = validateTrackingStatus(payload.status);
      if (statusError) errors.push(statusError);
    }
  }

  if (!partial || payload.trackingType !== undefined) {
    if (!hasValue(payload.trackingType)) {
      errors.push("trackingType is required");
    } else {
      const trackingTypeError = validateTrackingType(payload.trackingType);
      if (trackingTypeError) errors.push(trackingTypeError);
    }
  }

  if (!partial || payload.pickup !== undefined) {
    if (!hasValue(payload.pickup)) errors.push("pickup is required");
  }

  if (!partial || payload.delivery !== undefined) {
    if (!hasValue(payload.delivery)) errors.push("delivery is required");
  }

  if (payload.routeProgress !== undefined) {
    const routeProgressError = validateRouteProgress(payload.routeProgress);
    if (routeProgressError) errors.push(routeProgressError);
  }

  if (payload.speed !== undefined && toNumber(payload.speed) === null) {
    errors.push("speed must be a number");
  }

  return errors;
};
