import mongoose from "mongoose";

import { LOAD_COVER_STATUSES, LOAD_PRIORITIES, LOAD_STATUSES } from "../Models/Load.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const isValidLoadId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateLoadStatus = (status) => {
  if (!LOAD_STATUSES.includes(status)) {
    return `Invalid status. Allowed statuses: ${LOAD_STATUSES.join(", ")}`;
  }

  return null;
};

const validateCoverStatus = (coverStatus) => {
  if (!LOAD_COVER_STATUSES.includes(coverStatus)) {
    return `Invalid coverStatus. Allowed cover statuses: ${LOAD_COVER_STATUSES.join(", ")}`;
  }

  return null;
};

const validatePriority = (priority) => {
  if (!LOAD_PRIORITIES.includes(priority)) {
    return `Invalid priority. Allowed priorities: ${LOAD_PRIORITIES.join(", ")}`;
  }

  return null;
};

export const validateCreateLoad = (payload = {}) => {
  const errors = [];

  if (!hasValue(payload.customerName)) errors.push("customerName is required");
  if (!hasValue(payload.commodity)) errors.push("commodity is required");
  if (!hasValue(payload.weight)) errors.push("weight is required");
  if (!hasValue(payload.pickup?.location)) errors.push("pickup.location is required");
  if (!hasValue(payload.pickup?.date)) errors.push("pickup.date is required");
  if (!hasValue(payload.delivery?.location)) errors.push("delivery.location is required");
  if (!hasValue(payload.delivery?.date)) errors.push("delivery.date is required");
  if (!hasValue(payload.rate)) errors.push("rate is required");

  if (hasValue(payload.weight) && toNumber(payload.weight) === null) {
    errors.push("weight must be a number");
  }

  if (hasValue(payload.rate) && toNumber(payload.rate) === null) {
    errors.push("rate must be a number");
  }

  if (hasValue(payload.additionalCharges) && toNumber(payload.additionalCharges) === null) {
    errors.push("additionalCharges must be a number");
  }

  if (payload.status) {
    const statusError = validateLoadStatus(payload.status);
    if (statusError) errors.push(statusError);
  }

  if (payload.coverStatus) {
    const coverStatusError = validateCoverStatus(payload.coverStatus);
    if (coverStatusError) errors.push(coverStatusError);
  }

  if (payload.priority) {
    const priorityError = validatePriority(payload.priority);
    if (priorityError) errors.push(priorityError);
  }

  return errors;
};

export const validateUpdateLoad = (payload = {}) => {
  const errors = [];

  if (payload.weight !== undefined && toNumber(payload.weight) === null) {
    errors.push("weight must be a number");
  }

  if (payload.rate !== undefined && toNumber(payload.rate) === null) {
    errors.push("rate must be a number");
  }

  if (payload.additionalCharges !== undefined && toNumber(payload.additionalCharges) === null) {
    errors.push("additionalCharges must be a number");
  }

  if (payload.status) {
    const statusError = validateLoadStatus(payload.status);
    if (statusError) errors.push(statusError);
  }

  if (payload.coverStatus) {
    const coverStatusError = validateCoverStatus(payload.coverStatus);
    if (coverStatusError) errors.push(coverStatusError);
  }

  if (payload.priority) {
    const priorityError = validatePriority(payload.priority);
    if (priorityError) errors.push(priorityError);
  }

  return errors;
};
