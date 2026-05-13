import mongoose from "mongoose";

import {
  SETTLEMENT_APPROVAL_STATUSES,
  SETTLEMENT_DOCUMENT_STATUSES,
  SETTLEMENT_PAYMENT_METHODS,
  SETTLEMENT_PAYMENT_STATUSES,
  SETTLEMENT_STATUSES,
} from "../Models/Settlement.js";

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const earningFields = ["linehaul", "fuelSurcharge", "accessorials", "detention", "layover", "lumper", "otherPay"];
const deductionFields = ["advances", "fuelCard", "insurance", "maintenance", "escrow", "factoringFee", "otherDeductions"];

export const isValidSettlementId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateSettlementStatus = (status) =>
  SETTLEMENT_STATUSES.includes(status) ? null : `Invalid status. Allowed statuses: ${SETTLEMENT_STATUSES.join(", ")}`;

export const validateApprovalStatus = (approvalStatus) =>
  SETTLEMENT_APPROVAL_STATUSES.includes(approvalStatus)
    ? null
    : `Invalid approvalStatus. Allowed statuses: ${SETTLEMENT_APPROVAL_STATUSES.join(", ")}`;

export const validatePaymentStatus = (paymentStatus) =>
  SETTLEMENT_PAYMENT_STATUSES.includes(paymentStatus)
    ? null
    : `Invalid paymentStatus. Allowed statuses: ${SETTLEMENT_PAYMENT_STATUSES.join(", ")}`;

export const validateDocumentsStatus = (documentsStatus) =>
  SETTLEMENT_DOCUMENT_STATUSES.includes(documentsStatus)
    ? null
    : `Invalid documentsStatus. Allowed statuses: ${SETTLEMENT_DOCUMENT_STATUSES.join(", ")}`;

export const validatePaymentMethod = (paymentMethod) =>
  SETTLEMENT_PAYMENT_METHODS.includes(paymentMethod)
    ? null
    : `Invalid paymentMethod. Allowed methods: ${SETTLEMENT_PAYMENT_METHODS.join(", ")}`;

const validateNumbers = (payload, errors) => {
  if (payload.paidAmount !== undefined && !Number.isFinite(Number(payload.paidAmount))) {
    errors.push("paidAmount must be a number");
  }

  for (const field of earningFields) {
    if (payload.earnings?.[field] !== undefined && !Number.isFinite(Number(payload.earnings[field]))) {
      errors.push(`earnings.${field} must be a number`);
    }
  }

  for (const field of deductionFields) {
    if (payload.deductions?.[field] !== undefined && !Number.isFinite(Number(payload.deductions[field]))) {
      errors.push(`deductions.${field} must be a number`);
    }
  }
};

export const validateSettlementPayload = (payload = {}, { partial = false } = {}) => {
  const errors = [];

  if (!partial || payload.loadNumber !== undefined) {
    if (!hasValue(payload.loadNumber)) errors.push("loadNumber is required");
  }

  if (!partial || payload.settlementNumber !== undefined) {
    if (!hasValue(payload.settlementNumber)) errors.push("settlementNumber is required");
  }

  if (!partial || payload.carrierName !== undefined) {
    if (!hasValue(payload.carrierName)) errors.push("carrierName is required");
  }

  if (!partial || payload.settlementDate !== undefined) {
    if (!hasValue(payload.settlementDate)) errors.push("settlementDate is required");
  }

  for (const dateField of ["settlementDate", "dueDate", "deliveryDate"]) {
    if (payload[dateField] !== undefined && payload[dateField] && Number.isNaN(new Date(payload[dateField]).getTime())) {
      errors.push(`${dateField} must be a valid date`);
    }
  }

  if (hasValue(payload.carrierEmail) && !emailPattern.test(String(payload.carrierEmail).trim())) {
    errors.push("carrierEmail must be valid");
  }

  if (payload.status) {
    const error = validateSettlementStatus(payload.status);
    if (error) errors.push(error);
  }

  if (payload.approvalStatus) {
    const error = validateApprovalStatus(payload.approvalStatus);
    if (error) errors.push(error);
  }

  if (payload.paymentStatus) {
    const error = validatePaymentStatus(payload.paymentStatus);
    if (error) errors.push(error);
  }

  if (payload.documentsStatus) {
    const error = validateDocumentsStatus(payload.documentsStatus);
    if (error) errors.push(error);
  }

  if (payload.paymentMethod) {
    const error = validatePaymentMethod(payload.paymentMethod);
    if (error) errors.push(error);
  }

  validateNumbers(payload, errors);
  return errors;
};

export const validateSettlementDocumentPayload = (payload = {}) => {
  const errors = [];
  if (!hasValue(payload.documentType)) errors.push("documentType is required");
  return errors;
};
