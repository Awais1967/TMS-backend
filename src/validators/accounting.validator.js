import mongoose from "mongoose";

import {
  ACCOUNTING_STATUSES,
  CARRIER_PAYMENT_STATUSES,
  CUSTOMER_BILLING_STATUSES,
  DISPUTE_STATUSES,
} from "../Models/Accounting.js";

export const isValidAccountingId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

export const validateAccountingStatus = (status) => {
  if (!ACCOUNTING_STATUSES.includes(status)) {
    return `Invalid overallStatus. Allowed statuses: ${ACCOUNTING_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateCustomerBillingStatus = (status) => {
  if (!CUSTOMER_BILLING_STATUSES.includes(status)) {
    return `Invalid customerBillingStatus. Allowed statuses: ${CUSTOMER_BILLING_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateCarrierPaymentStatus = (status) => {
  if (!CARRIER_PAYMENT_STATUSES.includes(status)) {
    return `Invalid carrierPaymentStatus. Allowed statuses: ${CARRIER_PAYMENT_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateDisputeStatus = (status) => {
  if (!DISPUTE_STATUSES.includes(status)) {
    return `Invalid disputeStatus. Allowed statuses: ${DISPUTE_STATUSES.join(", ")}`;
  }

  return null;
};

export const validateAccountingStatusPayload = (payload = {}) => {
  const errors = [];
  const overallStatus = payload.overallStatus || payload.status;

  if (overallStatus) {
    const statusError = validateAccountingStatus(overallStatus);
    if (statusError) errors.push(statusError);
  }

  if (payload.customerBillingStatus) {
    const customerBillingStatusError = validateCustomerBillingStatus(payload.customerBillingStatus);
    if (customerBillingStatusError) errors.push(customerBillingStatusError);
  }

  if (payload.carrierPaymentStatus) {
    const carrierPaymentStatusError = validateCarrierPaymentStatus(payload.carrierPaymentStatus);
    if (carrierPaymentStatusError) errors.push(carrierPaymentStatusError);
  }

  if (payload.disputeStatus) {
    const disputeStatusError = validateDisputeStatus(payload.disputeStatus);
    if (disputeStatusError) errors.push(disputeStatusError);
  }

  if (!overallStatus && !payload.customerBillingStatus && !payload.carrierPaymentStatus && !payload.disputeStatus) {
    errors.push("At least one status field is required");
  }

  return errors;
};
