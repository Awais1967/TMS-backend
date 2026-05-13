import mongoose from "mongoose";

import { CARRIER_DRIVER_STATUSES, CARRIER_STATUSES } from "../Models/Carrier.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidCarrierId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateCarrierStatus = (status) => {
  if (!CARRIER_STATUSES.includes(status)) {
    return `Invalid status. Allowed statuses: ${CARRIER_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateCarrierDriverStatus = (status) => {
  if (!CARRIER_DRIVER_STATUSES.includes(status)) {
    return `Invalid driver status. Allowed statuses: ${CARRIER_DRIVER_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateCarrierPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.carrierName !== undefined) {
    if (!hasValue(payload.carrierName)) errors.push("carrierName is required");
  }

  if (!partial || payload.phone !== undefined) {
    if (!hasValue(payload.phone)) errors.push("phone is required");
  }

  if (!partial || payload.mcNumber !== undefined) {
    if (!hasValue(payload.mcNumber)) errors.push("mcNumber is required");
  }

  if (hasValue(payload.email) && !emailPattern.test(String(payload.email).trim())) {
    errors.push("email must be valid");
  }

  if (payload.status) {
    const statusError = validateCarrierStatus(payload.status);
    if (statusError) errors.push(statusError);
  }

  for (const key of ["driversCount", "activeLoads", "onTimeRate"]) {
    if (payload[key] !== undefined && !Number.isFinite(Number(payload[key]))) {
      errors.push(`${key} must be a number`);
    }
  }

  return errors;
};

export const validateCarrierDocumentPayload = (payload = {}) => {
  const errors = [];

  if (!hasValue(payload.documentType)) errors.push("documentType is required");

  return errors;
};

export const validateCarrierDriverPayload = (payload = {}) => {
  const errors = [];

  if (!hasValue(payload.driverName)) errors.push("driverName is required");

  if (hasValue(payload.email) && !emailPattern.test(String(payload.email).trim())) {
    errors.push("email must be valid");
  }

  if (payload.status) {
    const statusError = validateCarrierDriverStatus(payload.status);
    if (statusError) errors.push(statusError);
  }

  return errors;
};
