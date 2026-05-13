import mongoose from "mongoose";

import {
  DIRECT_BILL_DISPUTE_STATUSES,
  DIRECT_BILL_PAYMENT_STATUSES,
  DIRECT_BILL_STATUSES,
} from "../Models/DirectBill.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const chargeFields = [
  "baseRate",
  "fuelSurcharge",
  "accessorials",
  "detention",
  "lumper",
  "otherCharges",
  "discount",
  "tax",
];

export const isValidDirectBillId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validatePaymentStatus = (paymentStatus) => {
  if (!DIRECT_BILL_PAYMENT_STATUSES.includes(paymentStatus)) {
    return `Invalid paymentStatus. Allowed statuses: ${DIRECT_BILL_PAYMENT_STATUSES.join(", ")}`;
  }
  return null;
};

export const validateBillStatus = (billStatus) => {
  if (!DIRECT_BILL_STATUSES.includes(billStatus)) {
    return `Invalid billStatus. Allowed statuses: ${DIRECT_BILL_STATUSES.join(", ")}`;
  }
  return null;
};

export const validateDisputeStatus = (disputeStatus) => {
  if (!DIRECT_BILL_DISPUTE_STATUSES.includes(disputeStatus)) {
    return `Invalid disputeStatus. Allowed statuses: ${DIRECT_BILL_DISPUTE_STATUSES.join(", ")}`;
  }
  return null;
};

const validateAmountFields = (payload = {}, errors) => {
  if (payload.weight !== undefined && !Number.isFinite(Number(payload.weight))) {
    errors.push("weight must be a number");
  }

  if (payload.paidAmount !== undefined && !Number.isFinite(Number(payload.paidAmount))) {
    errors.push("paidAmount must be a number");
  }

  if (payload.charges && typeof payload.charges === "object") {
    for (const field of chargeFields) {
      if (payload.charges[field] !== undefined && !Number.isFinite(Number(payload.charges[field]))) {
        errors.push(`charges.${field} must be a number`);
      }
    }
  }
};

export const validateDirectBillPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.loadNumber !== undefined) {
    if (!hasValue(payload.loadNumber)) errors.push("loadNumber is required");
  }

  if (!partial || payload.invoiceNumber !== undefined) {
    if (!hasValue(payload.invoiceNumber)) errors.push("invoiceNumber is required");
  }

  if (!partial || payload.customerName !== undefined) {
    if (!hasValue(payload.customerName)) errors.push("customerName is required");
  }

  if (!partial || payload.invoiceDate !== undefined) {
    if (!hasValue(payload.invoiceDate)) errors.push("invoiceDate is required");
  }

  if (!partial || payload.dueDate !== undefined) {
    if (!hasValue(payload.dueDate)) errors.push("dueDate is required");
  }

  if (payload.invoiceDate !== undefined && Number.isNaN(new Date(payload.invoiceDate).getTime())) {
    errors.push("invoiceDate must be a valid date");
  }

  if (payload.dueDate !== undefined && Number.isNaN(new Date(payload.dueDate).getTime())) {
    errors.push("dueDate must be a valid date");
  }

  if (hasValue(payload.customerEmail) && !emailPattern.test(String(payload.customerEmail).trim())) {
    errors.push("customerEmail must be valid");
  }

  if (payload.paymentStatus) {
    const paymentStatusError = validatePaymentStatus(payload.paymentStatus);
    if (paymentStatusError) errors.push(paymentStatusError);
  }

  if (payload.billStatus) {
    const billStatusError = validateBillStatus(payload.billStatus);
    if (billStatusError) errors.push(billStatusError);
  }

  if (payload.disputeStatus) {
    const disputeStatusError = validateDisputeStatus(payload.disputeStatus);
    if (disputeStatusError) errors.push(disputeStatusError);
  }

  validateAmountFields(payload, errors);

  return errors;
};

export const validateDirectBillDocumentPayload = (payload = {}) => {
  const errors = [];
  if (!hasValue(payload.documentType)) errors.push("documentType is required");
  return errors;
};
