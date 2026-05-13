import fs from "fs/promises";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import DirectBill from "../Models/DirectBill.js";
import Factoring from "../Models/Factoring.js";
import Load from "../Models/Load.js";
import Settlement from "../Models/Settlement.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidSettlementId,
  validateApprovalStatus,
  validateDocumentsStatus,
  validatePaymentMethod,
  validatePaymentStatus,
  validateSettlementDocumentPayload,
  validateSettlementPayload,
  validateSettlementStatus,
} from "../validators/settlement.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set([
  "settlementNumber",
  "loadNumber",
  "carrierName",
  "netPay",
  "balanceDue",
  "settlementDate",
  "dueDate",
  "status",
  "approvalStatus",
  "paymentStatus",
  "createdAt",
  "updatedAt",
]);

const removeUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value !== undefined));

const loadNumberCandidates = (loadNumber = "") => {
  const value = String(loadNumber || "").trim();
  if (!value) return [];
  const withoutHash = value.replace(/^#/, "");
  return [...new Set([value, withoutHash, `#${withoutHash}`])];
};

const normalizeMoneyObject = (payload = {}, keys) =>
  removeUndefined(Object.fromEntries(keys.map((key) => [key, payload[key] !== undefined ? Number(payload[key]) : undefined])));

const normalizeSettlementPayload = (payload = {}) =>
  removeUndefined({
    loadNumber: payload.loadNumber?.trim(),
    settlementNumber: payload.settlementNumber?.trim(),
    invoiceNumber: payload.invoiceNumber?.trim(),
    carrierName: payload.carrierName?.trim(),
    carrierEmail: payload.carrierEmail?.trim().toLowerCase(),
    carrierPhone: payload.carrierPhone?.trim(),
    mcNumber: payload.mcNumber?.trim(),
    driverName: payload.driverName?.trim(),
    truckNumber: payload.truckNumber?.trim(),
    pickup: payload.pickup?.trim(),
    delivery: payload.delivery?.trim(),
    deliveryDate: payload.deliveryDate ? new Date(payload.deliveryDate) : undefined,
    settlementDate: payload.settlementDate ? new Date(payload.settlementDate) : undefined,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
    paymentTerms: payload.paymentTerms?.trim(),
    currency: payload.currency?.trim(),
    earnings: payload.earnings
      ? normalizeMoneyObject(payload.earnings, ["linehaul", "fuelSurcharge", "accessorials", "detention", "layover", "lumper", "otherPay"])
      : undefined,
    deductions: payload.deductions
      ? normalizeMoneyObject(payload.deductions, ["advances", "fuelCard", "insurance", "maintenance", "escrow", "factoringFee", "otherDeductions"])
      : undefined,
    paidAmount: payload.paidAmount !== undefined ? Number(payload.paidAmount) : undefined,
    status: payload.status,
    approvalStatus: payload.approvalStatus,
    paymentStatus: payload.paymentStatus,
    documentsStatus: payload.documentsStatus,
    paymentMethod: payload.paymentMethod,
    paymentReference: payload.paymentReference?.trim(),
    rejectionReason: payload.rejectionReason?.trim(),
    settlementPreview: payload.settlementPreview,
    notes: payload.notes,
  });

const linkRelatedRecords = async ({ loadNumber, invoiceNumber }) => {
  const [load, directBill, factoring] = await Promise.all([
    loadNumber ? Load.findOne({ loadNumber: { $in: loadNumberCandidates(loadNumber) } }) : null,
    invoiceNumber ? DirectBill.findOne({ invoiceNumber }) : null,
    invoiceNumber ? Factoring.findOne({ invoiceNumber: invoiceNumber.replace("INV-", "FAC-") }) : null,
  ]);

  return {
    load,
    directBill,
    factoring,
  };
};

const applyLoadDefaults = (payload, load) => {
  if (!load) return payload;
  return {
    ...payload,
    load: load._id,
    carrierName: payload.carrierName || load.carrierName || "Pending Carrier",
    driverName: payload.driverName ?? load.driverName,
    truckNumber: payload.truckNumber ?? load.truckNumber,
    pickup: payload.pickup || [load.pickup?.city, load.pickup?.state].filter(Boolean).join(", "),
    delivery: payload.delivery || [load.delivery?.city, load.delivery?.state].filter(Boolean).join(", "),
    deliveryDate: payload.deliveryDate || load.delivery?.date,
  };
};

const buildSettlementQuery = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.documentsStatus) filter.documentsStatus = query.documentsStatus;
  if (query.carrierName) filter.carrierName = { $regex: escapeRegex(query.carrierName), $options: "i" };
  if (query.loadNumber) filter.loadNumber = { $regex: escapeRegex(query.loadNumber), $options: "i" };
  if (query.settlementNumber) filter.settlementNumber = { $regex: escapeRegex(query.settlementNumber), $options: "i" };
  if (query.invoiceNumber) filter.invoiceNumber = { $regex: escapeRegex(query.invoiceNumber), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { loadNumber: regex },
      { settlementNumber: regex },
      { invoiceNumber: regex },
      { carrierName: regex },
      { driverName: regex },
      { truckNumber: regex },
      { mcNumber: regex },
      { status: regex },
      { approvalStatus: regex },
      { paymentStatus: regex },
      { documentsStatus: regex },
    ];
  }
  return filter;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

const findSettlementOrSend = async (id, res) => {
  if (!isValidSettlementId(id)) {
    sendError(res, "Invalid settlement id", 400);
    return null;
  }
  const settlement = await Settlement.findById(id);
  if (!settlement) {
    sendError(res, "Settlement not found", 404);
    return null;
  }
  return settlement;
};

export const getSettlements = asyncHandler(async (req, res) => {
  for (const [key, validator] of [
    ["status", validateSettlementStatus],
    ["approvalStatus", validateApprovalStatus],
    ["paymentStatus", validatePaymentStatus],
    ["documentsStatus", validateDocumentsStatus],
  ]) {
    if (req.query[key]) {
      const error = validator(req.query[key]);
      if (error) return sendError(res, error, 400);
    }
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildSettlementQuery(req.query);

  const [settlements, total, summaryRows, pendingApproval, approved, paid, onHold, rejected] = await Promise.all([
    Settlement.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Settlement.countDocuments(filter),
    Settlement.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$totalEarnings" },
          totalDeductions: { $sum: "$totalDeductions" },
          totalNetPay: { $sum: "$netPay" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceDue" },
        },
      },
    ]),
    Settlement.countDocuments({ approvalStatus: "Pending" }),
    Settlement.countDocuments({ approvalStatus: "Approved" }),
    Settlement.countDocuments({ paymentStatus: "Paid" }),
    Settlement.countDocuments({ status: "Hold" }),
    Settlement.countDocuments({ status: "Rejected" }),
  ]);

  const summary = summaryRows[0] || {};
  return sendSuccess(res, "Settlements fetched successfully", {
    settlements,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    summary: {
      totalEarnings: summary.totalEarnings || 0,
      totalDeductions: summary.totalDeductions || 0,
      totalNetPay: summary.totalNetPay || 0,
      totalPaid: summary.totalPaid || 0,
      totalBalance: summary.totalBalance || 0,
      pendingApproval,
      approved,
      paid,
      onHold,
      rejected,
    },
  });
});

export const getSettlementById = asyncHandler(async (req, res) => {
  if (!isValidSettlementId(req.params.id)) return sendError(res, "Invalid settlement id", 400);
  const settlement = await Settlement.findById(req.params.id).populate("load").populate("directBill").populate("factoring");
  if (!settlement) return sendError(res, "Settlement not found", 404);
  return sendSuccess(res, "Settlement fetched successfully", { settlement });
});

export const createSettlement = asyncHandler(async (req, res) => {
  const errors = validateSettlementPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  let payload = normalizeSettlementPayload(req.body);
  const { load, directBill, factoring } = await linkRelatedRecords(payload);
  payload = applyLoadDefaults(payload, load);

  const settlement = await Settlement.create({
    ...payload,
    directBill: directBill?._id || null,
    factoring: factoring?._id || null,
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate settlementNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Settlement created successfully", { settlement }, 201);
});

export const updateSettlement = asyncHandler(async (req, res) => {
  const errors = validateSettlementPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  const payload = normalizeSettlementPayload(req.body);

  if (payload.earnings) payload.earnings = { ...settlement.earnings?.toObject?.(), ...payload.earnings };
  if (payload.deductions) payload.deductions = { ...settlement.deductions?.toObject?.(), ...payload.deductions };
  if (payload.loadNumber || payload.invoiceNumber) {
    const { load, directBill, factoring } = await linkRelatedRecords({
      loadNumber: payload.loadNumber || settlement.loadNumber,
      invoiceNumber: payload.invoiceNumber || settlement.invoiceNumber,
    });
    if (load) payload.load = load._id;
    if (directBill) payload.directBill = directBill._id;
    if (factoring) payload.factoring = factoring._id;
  }

  Object.assign(settlement, payload);
  await settlement.save();
  return sendSuccess(res, "Settlement updated successfully", { settlement });
});

export const updateSettlementStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const error = validateSettlementStatus(status);
  if (error) return sendError(res, error, 400);
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.status = status;
  await settlement.save();
  return sendSuccess(res, "Settlement status updated successfully", { settlement });
});

export const updateSettlementApproval = asyncHandler(async (req, res) => {
  const approvalStatus = req.body?.approvalStatus;
  const error = validateApprovalStatus(approvalStatus);
  if (error) return sendError(res, error, 400);
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.approvalStatus = approvalStatus;
  if (approvalStatus === "Approved") {
    settlement.status = "Approved";
    settlement.approvedBy = req.user?._id || null;
    settlement.approvedAt = new Date();
  }
  if (approvalStatus === "Rejected") {
    settlement.status = "Rejected";
    settlement.rejectedBy = req.user?._id || null;
    settlement.rejectedAt = new Date();
  }
  await settlement.save();
  return sendSuccess(res, "Settlement approval updated successfully", { settlement });
});

export const updateSettlementPayment = asyncHandler(async (req, res) => {
  if (req.body?.paidAmount === undefined || !Number.isFinite(Number(req.body.paidAmount))) {
    return sendError(res, "paidAmount must be a number", 400);
  }
  if (req.body.paymentStatus) {
    const error = validatePaymentStatus(req.body.paymentStatus);
    if (error) return sendError(res, error, 400);
  }
  if (req.body.paymentMethod) {
    const error = validatePaymentMethod(req.body.paymentMethod);
    if (error) return sendError(res, error, 400);
  }
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.paidAmount = Number(req.body.paidAmount);
  if (req.body.paymentStatus) settlement.paymentStatus = req.body.paymentStatus;
  if (req.body.paymentMethod) settlement.paymentMethod = req.body.paymentMethod;
  if (req.body.paymentReference !== undefined) settlement.paymentReference = String(req.body.paymentReference || "").trim();
  await settlement.save();
  return sendSuccess(res, "Settlement payment updated successfully", { settlement });
});

export const updateSettlementDocumentsStatus = asyncHandler(async (req, res) => {
  const documentsStatus = req.body?.documentsStatus;
  const error = validateDocumentsStatus(documentsStatus);
  if (error) return sendError(res, error, 400);
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.documentsStatus = documentsStatus;
  await settlement.save();
  return sendSuccess(res, "Settlement documents status updated successfully", { settlement });
});

export const rejectSettlement = asyncHandler(async (req, res) => {
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.status = "Rejected";
  settlement.approvalStatus = "Rejected";
  settlement.rejectedBy = req.user?._id || null;
  settlement.rejectedAt = new Date();
  settlement.rejectionReason = String(req.body?.rejectionReason || "").trim();
  await settlement.save();
  return sendSuccess(res, "Settlement rejected successfully", { settlement });
});

export const addSettlementDocument = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, "File is required", 400);
  const errors = validateSettlementDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) {
    await cleanupUploadedFile(req.file);
    return null;
  }
  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");
  settlement.documents.push({
    name: documentType,
    documentType,
    originalName: req.file.originalname,
    fileName: req.file.filename,
    fileUrl: storedFile.fileUrl,
    storage: storedFile.storage,
    s3Key: storedFile.s3Key,
    bucket: storedFile.bucket,
    mimeType: req.file.mimetype,
    size: req.file.size,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    status: String(req.body.status || "Uploaded").trim(),
    notes: String(req.body.notes || "").trim(),
  });
  settlement.recalculateDocumentsStatus();
  await settlement.save();
  return sendSuccess(res, "Settlement document added successfully", { settlement }, 201);
});

export const deleteSettlementDocument = asyncHandler(async (req, res) => {
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  const document = settlement.documents.id(req.params.documentId);
  if (!document) return sendError(res, "Settlement document not found", 404);
  document.deleteOne();
  settlement.recalculateDocumentsStatus();
  await settlement.save();
  return sendSuccess(res, "Settlement document deleted successfully", { settlement });
});

export const addSettlementNote = asyncHandler(async (req, res) => {
  const note = String(req.body?.note || "").trim();
  if (!note) return sendError(res, "note is required", 400);
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  settlement.notes.push({ note, createdBy: req.user?._id || null, createdAt: new Date() });
  await settlement.save();
  return sendSuccess(res, "Settlement note added successfully", { settlement }, 201);
});

export const deleteSettlementNote = asyncHandler(async (req, res) => {
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  const note = settlement.notes.id(req.params.noteId);
  if (!note) return sendError(res, "Settlement note not found", 404);
  note.deleteOne();
  await settlement.save();
  return sendSuccess(res, "Settlement note deleted successfully", { settlement });
});

export const deleteSettlement = asyncHandler(async (req, res) => {
  const settlement = await findSettlementOrSend(req.params.id, res);
  if (!settlement) return null;
  await settlement.deleteOne();
  return sendSuccess(res, "Settlement deleted successfully", {});
});
