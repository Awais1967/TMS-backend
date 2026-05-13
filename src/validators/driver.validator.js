import mongoose from "mongoose";

import { DRIVER_AVAILABILITY_STATUSES } from "../Models/Driver.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidDriverId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateDriverStatus = (status) => {
  if (!DRIVER_AVAILABILITY_STATUSES.includes(status)) {
    return `Invalid availabilityStatus. Allowed statuses: ${DRIVER_AVAILABILITY_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateDriverPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.driverName !== undefined) {
    if (!hasValue(payload.driverName)) errors.push("driverName is required");
  }

  if (!partial || payload.phone !== undefined) {
    if (!hasValue(payload.phone)) errors.push("phone is required");
  }

  if (!partial || payload.email !== undefined) {
    if (!hasValue(payload.email)) errors.push("email is required");
  }

  if (hasValue(payload.email) && !emailPattern.test(String(payload.email).trim())) {
    errors.push("email must be valid");
  }

  if (!partial || payload.licenseNumber !== undefined) {
    if (!hasValue(payload.licenseNumber)) errors.push("licenseNumber is required");
  }

  if (!partial || payload.licenseExpiry !== undefined) {
    if (!hasValue(payload.licenseExpiry)) errors.push("licenseExpiry is required");
  }

  if (payload.licenseExpiry !== undefined && Number.isNaN(new Date(payload.licenseExpiry).getTime())) {
    errors.push("licenseExpiry must be a valid date");
  }

  if (!partial || payload.availabilityStatus !== undefined) {
    if (!hasValue(payload.availabilityStatus)) {
      errors.push("availabilityStatus is required");
    } else {
      const statusError = validateDriverStatus(payload.availabilityStatus);
      if (statusError) errors.push(statusError);
    }
  }

  for (const key of ["assignedLoads", "completedLoads", "onTimeRate", "totalMiles"]) {
    if (payload[key] !== undefined && !Number.isFinite(Number(payload[key]))) {
      errors.push(`${key} must be a number`);
    }
  }

  return errors;
};

export const validateDriverDocumentPayload = (payload = {}) => {
  const errors = [];

  if (!hasValue(payload.documentType)) errors.push("documentType is required");

  return errors;
};
