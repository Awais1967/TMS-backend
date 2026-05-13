import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Accounting from "../Models/Accounting.js";
import {
  isValidAccountingId,
  validateAccountingStatus,
  validateAccountingStatusPayload,
  validateDisputeStatus,
} from "../validators/accounting.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set(["loadNumber", "customerName", "carrierName", "overallStatus", "amount", "createdAt"]);

const buildAccountingQuery = (query) => {
  const filter = {};

  if (query.overallStatus) filter.overallStatus = query.overallStatus;
  if (query.status) filter.overallStatus = query.status;
  if (query.disputeStatus) filter.disputeStatus = query.disputeStatus;
  if (query.customerName) filter.customerName = { $regex: escapeRegex(query.customerName), $options: "i" };
  if (query.carrierName) filter.carrierName = { $regex: escapeRegex(query.carrierName), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { loadNumber: regex },
      { customerName: regex },
      { carrierName: regex },
      { invoiceNumber: regex },
      { overallStatus: regex },
      { disputeStatus: regex },
      { "customerBilling.invoiceNumber": regex },
      { "carrierPayment.billNumber": regex },
    ];
  }

  return filter;
};

export const getAccountingRecords = asyncHandler(async (req, res) => {
  const requestedStatus = req.query.overallStatus || req.query.status;
  if (requestedStatus) {
    const statusError = validateAccountingStatus(requestedStatus);
    if (statusError) return sendError(res, statusError, 400);
  }

  if (req.query.disputeStatus) {
    const disputeStatusError = validateDisputeStatus(req.query.disputeStatus);
    if (disputeStatusError) return sendError(res, disputeStatusError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildAccountingQuery(req.query);

  const [accounting, total, pending, invoiced, partiallyPaid, paid, disputed, closed, totalRecords] = await Promise.all([
    Accounting.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Accounting.countDocuments(filter),
    Accounting.countDocuments({ overallStatus: "Pending" }),
    Accounting.countDocuments({ overallStatus: "Invoiced" }),
    Accounting.countDocuments({ overallStatus: "Partially Paid" }),
    Accounting.countDocuments({ overallStatus: "Paid" }),
    Accounting.countDocuments({ $or: [{ overallStatus: "Disputed" }, { disputeStatus: "Open" }] }),
    Accounting.countDocuments({ overallStatus: "Closed" }),
    Accounting.countDocuments({}),
  ]);

  return sendSuccess(res, "Accounting records fetched successfully", {
    accounting,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    stats: {
      pending,
      invoiced,
      partiallyPaid,
      paid,
      disputed,
      closed,
      total: totalRecords,
    },
  });
});

export const getAccountingRecordById = asyncHandler(async (req, res) => {
  if (!isValidAccountingId(req.params.id)) {
    return sendError(res, "Invalid accounting record id", 400);
  }

  const accounting = await Accounting.findById(req.params.id).populate("load");

  if (!accounting) {
    return sendError(res, "Accounting record not found", 404);
  }

  return sendSuccess(res, "Accounting record fetched successfully", { accounting });
});

export const updateAccountingStatus = asyncHandler(async (req, res) => {
  if (!isValidAccountingId(req.params.id)) {
    return sendError(res, "Invalid accounting record id", 400);
  }

  const errors = validateAccountingStatusPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const update = {};
  const overallStatus = req.body.overallStatus || req.body.status;

  if (overallStatus) update.overallStatus = overallStatus;
  if (req.body.disputeStatus) update.disputeStatus = req.body.disputeStatus;
  if (req.body.customerBillingStatus) update["customerBilling.status"] = req.body.customerBillingStatus;
  if (req.body.carrierPaymentStatus) update["carrierPayment.status"] = req.body.carrierPaymentStatus;

  const accounting = await Accounting.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (!accounting) {
    return sendError(res, "Accounting record not found", 404);
  }

  return sendSuccess(res, "Accounting status updated successfully", { accounting });
});
