import mongoose from "mongoose";

import {
  FACTORING_DOCUMENT_STATUSES,
  FACTORING_PAYMENT_STATUSES,
  FACTORING_STATUSES,
} from "../Models/Factoring.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNumberBetweenZeroAndHundred = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100;
};

export const isValidFactoringId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validatePaymentStatus = (paymentStatus) => {
  if (!FACTORING_PAYMENT_STATUSES.includes(paymentStatus)) {
    return `Invalid paymentStatus. Allowed statuses: ${FACTORING_PAYMENT_STATUSES.join(", ")}`;
  }
  return null;
};

export const validateFactoringStatus = (factoringStatus) => {
  if (!FACTORING_STATUSES.includes(factoringStatus)) {
    return `Invalid factoringStatus. Allowed statuses: ${FACTORING_STATUSES.join(", ")}`;
  }
  return null;
};

export const validateDocumentsStatus = (documentsStatus) => {
  if (!FACTORING_DOCUMENT_STATUSES.includes(documentsStatus)) {
    return `Invalid documentsStatus. Allowed statuses: ${FACTORING_DOCUMENT_STATUSES.join(", ")}`;
  }
  return null;
};

export const validateFactoringPayload = (payload = {}, { partial = false } = {}) => {
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

  if (!partial || payload.carrierName !== undefined) {
    if (!hasValue(payload.carrierName)) errors.push("carrierName is required");
  }

  if (!partial || payload.factoringCompany !== undefined) {
    if (!hasValue(payload.factoringCompany)) errors.push("factoringCompany is required");
  }

  if (!partial || payload.amount !== undefined) {
    if (!hasValue(payload.amount)) {
      errors.push("amount is required");
    } else if (!Number.isFinite(Number(payload.amount))) {
      errors.push("amount must be a number");
    }
  }

  if (!partial || payload.submissionDate !== undefined) {
    if (!hasValue(payload.submissionDate)) errors.push("submissionDate is required");
  }

  if (payload.submissionDate !== undefined && Number.isNaN(new Date(payload.submissionDate).getTime())) {
    errors.push("submissionDate must be a valid date");
  }

  if (payload.expectedPaymentDate !== undefined && payload.expectedPaymentDate && Number.isNaN(new Date(payload.expectedPaymentDate).getTime())) {
    errors.push("expectedPaymentDate must be a valid date");
  }

  if (payload.paymentDate !== undefined && payload.paymentDate && Number.isNaN(new Date(payload.paymentDate).getTime())) {
    errors.push("paymentDate must be a valid date");
  }

  for (const key of ["carrierEmail", "factoringCompanyEmail"]) {
    if (hasValue(payload[key]) && !emailPattern.test(String(payload[key]).trim())) {
      errors.push(`${key} must be valid`);
    }
  }

  if (payload.advanceRate !== undefined && !isNumberBetweenZeroAndHundred(payload.advanceRate)) {
    errors.push("advanceRate must be a number between 0 and 100");
  }

  if (payload.feePercent !== undefined && !isNumberBetweenZeroAndHundred(payload.feePercent)) {
    errors.push("feePercent must be a number between 0 and 100");
  }

  if (payload.paymentStatus) {
    const paymentStatusError = validatePaymentStatus(payload.paymentStatus);
    if (paymentStatusError) errors.push(paymentStatusError);
  }

  if (payload.factoringStatus) {
    const factoringStatusError = validateFactoringStatus(payload.factoringStatus);
    if (factoringStatusError) errors.push(factoringStatusError);
  }

  if (payload.documentsStatus) {
    const documentsStatusError = validateDocumentsStatus(payload.documentsStatus);
    if (documentsStatusError) errors.push(documentsStatusError);
  }

  return errors;
};

export const validateFactoringDocumentPayload = (payload = {}) => {
  const errors = [];
  if (!hasValue(payload.documentType)) errors.push("documentType is required");
  return errors;
};
