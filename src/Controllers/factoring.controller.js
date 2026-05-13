import fs from "fs/promises";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import DirectBill from "../Models/DirectBill.js";
import Factoring from "../Models/Factoring.js";
import Load from "../Models/Load.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidFactoringId,
  validateDocumentsStatus,
  validateFactoringDocumentPayload,
  validateFactoringPayload,
  validateFactoringStatus,
  validatePaymentStatus,
} from "../validators/factoring.validator.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const allowedSortFields = new Set([
  "invoiceNumber",
  "loadNumber",
  "customerName",
  "carrierName",
  "factoringCompany",
  "amount",
  "advanceAmount",
  "netPay",
  "submissionDate",
  "expectedPaymentDate",
  "paymentStatus",
  "factoringStatus",
  "documentsStatus",
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

const normalizeFactoringPayload = (payload = {}) =>
  removeUndefined({
    loadNumber: payload.loadNumber?.trim(),
    invoiceNumber: payload.invoiceNumber?.trim(),
    customerName: payload.customerName?.trim(),
    carrierName: payload.carrierName?.trim(),
    carrierEmail: payload.carrierEmail?.trim().toLowerCase(),
    carrierPhone: payload.carrierPhone?.trim(),
    mcNumber: payload.mcNumber?.trim(),
    factoringCompany: payload.factoringCompany?.trim(),
    factoringCompanyEmail: payload.factoringCompanyEmail?.trim().toLowerCase(),
    factoringCompanyPhone: payload.factoringCompanyPhone?.trim(),
    factoringCompanyAddress: payload.factoringCompanyAddress?.trim(),
    amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
    advanceRate: payload.advanceRate !== undefined ? Number(payload.advanceRate) : undefined,
    feePercent: payload.feePercent !== undefined ? Number(payload.feePercent) : undefined,
    submissionDate: payload.submissionDate ? new Date(payload.submissionDate) : undefined,
    expectedPaymentDate: payload.expectedPaymentDate ? new Date(payload.expectedPaymentDate) : undefined,
    paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : undefined,
    paymentStatus: payload.paymentStatus,
    factoringStatus: payload.factoringStatus,
    documentsStatus: payload.documentsStatus,
    rejectionReason: payload.rejectionReason?.trim(),
    notes: payload.notes,
  });

const linkLoadAndDirectBill = async ({ loadNumber, invoiceNumber }) => {
  const [load, directBill] = await Promise.all([
    loadNumber ? Load.findOne({ loadNumber: { $in: loadNumberCandidates(loadNumber) } }) : null,
    invoiceNumber ? DirectBill.findOne({ invoiceNumber }) : null,
  ]);

  return {
    load: load?._id || null,
    directBill: directBill?._id || null,
  };
};

const buildFactoringQuery = (query) => {
  const filter = {};

  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.factoringStatus) filter.factoringStatus = query.factoringStatus;
  if (query.documentsStatus) filter.documentsStatus = query.documentsStatus;
  if (query.factoringCompany) filter.factoringCompany = { $regex: escapeRegex(query.factoringCompany), $options: "i" };
  if (query.carrierName) filter.carrierName = { $regex: escapeRegex(query.carrierName), $options: "i" };
  if (query.customerName) filter.customerName = { $regex: escapeRegex(query.customerName), $options: "i" };
  if (query.loadNumber) filter.loadNumber = { $regex: escapeRegex(query.loadNumber), $options: "i" };
  if (query.invoiceNumber) filter.invoiceNumber = { $regex: escapeRegex(query.invoiceNumber), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { loadNumber: regex },
      { invoiceNumber: regex },
      { customerName: regex },
      { carrierName: regex },
      { factoringCompany: regex },
      { mcNumber: regex },
      { paymentStatus: regex },
      { factoringStatus: regex },
      { documentsStatus: regex },
    ];
  }

  return filter;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

const findFactoringOrSend = async (id, res) => {
  if (!isValidFactoringId(id)) {
    sendError(res, "Invalid factoring id", 400);
    return null;
  }

  const factoring = await Factoring.findById(id);

  if (!factoring) {
    sendError(res, "Factoring record not found", 404);
    return null;
  }

  return factoring;
};

export const getFactoringRecords = asyncHandler(async (req, res) => {
  if (req.query.paymentStatus) {
    const paymentStatusError = validatePaymentStatus(req.query.paymentStatus);
    if (paymentStatusError) return sendError(res, paymentStatusError, 400);
  }

  if (req.query.factoringStatus) {
    const factoringStatusError = validateFactoringStatus(req.query.factoringStatus);
    if (factoringStatusError) return sendError(res, factoringStatusError, 400);
  }

  if (req.query.documentsStatus) {
    const documentsStatusError = validateDocumentsStatus(req.query.documentsStatus);
    if (documentsStatusError) return sendError(res, documentsStatusError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const requestedSortBy = String(req.query.sortBy || "createdAt");
  const sortBy = allowedSortFields.has(requestedSortBy) ? requestedSortBy : "createdAt";
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildFactoringQuery(req.query);

  const [
    factoring,
    total,
    summaryRows,
    pendingRecords,
    approvedRecords,
    fundedRecords,
    rejectedRecords,
    missingDocuments,
  ] = await Promise.all([
    Factoring.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Factoring.countDocuments(filter),
    Factoring.aggregate([
      {
        $group: {
          _id: null,
          totalFactored: { $sum: "$amount" },
          totalAdvance: { $sum: "$advanceAmount" },
          totalFees: { $sum: "$feeAmount" },
          totalNetPay: { $sum: "$netPay" },
        },
      },
    ]),
    Factoring.countDocuments({ paymentStatus: "Pending" }),
    Factoring.countDocuments({ factoringStatus: "Approved" }),
    Factoring.countDocuments({ factoringStatus: "Funded" }),
    Factoring.countDocuments({ factoringStatus: "Rejected" }),
    Factoring.countDocuments({ documentsStatus: "Missing" }),
  ]);

  const summary = summaryRows[0] || {};

  return sendSuccess(res, "Factoring records fetched successfully", {
    factoring,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    summary: {
      totalFactored: summary.totalFactored || 0,
      totalAdvance: summary.totalAdvance || 0,
      totalFees: summary.totalFees || 0,
      totalNetPay: summary.totalNetPay || 0,
      pendingRecords,
      approvedRecords,
      fundedRecords,
      rejectedRecords,
      missingDocuments,
    },
  });
});

export const getFactoringById = asyncHandler(async (req, res) => {
  if (!isValidFactoringId(req.params.id)) {
    return sendError(res, "Invalid factoring id", 400);
  }

  const factoring = await Factoring.findById(req.params.id).populate("load").populate("directBill");

  if (!factoring) {
    return sendError(res, "Factoring record not found", 404);
  }

  return sendSuccess(res, "Factoring record fetched successfully", { factoring });
});

export const createFactoringRecord = asyncHandler(async (req, res) => {
  const errors = validateFactoringPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const payload = normalizeFactoringPayload(req.body);
  const links = await linkLoadAndDirectBill(payload);

  const factoring = await Factoring.create({
    ...payload,
    ...links,
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate invoiceNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Factoring record created successfully", { factoring }, 201);
});

export const updateFactoringRecord = asyncHandler(async (req, res) => {
  const errors = validateFactoringPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  const payload = normalizeFactoringPayload(req.body);

  if (payload.loadNumber || payload.invoiceNumber) {
    const links = await linkLoadAndDirectBill({
      loadNumber: payload.loadNumber || factoring.loadNumber,
      invoiceNumber: payload.invoiceNumber || factoring.invoiceNumber,
    });
    Object.assign(payload, links);
  }

  Object.assign(factoring, payload);
  await factoring.save();

  return sendSuccess(res, "Factoring record updated successfully", { factoring });
});

export const updateFactoringStatus = asyncHandler(async (req, res) => {
  const factoringStatus = req.body?.factoringStatus;
  const factoringStatusError = validateFactoringStatus(factoringStatus);
  if (factoringStatusError) return sendError(res, factoringStatusError, 400);

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  factoring.factoringStatus = factoringStatus;
  await factoring.save();

  return sendSuccess(res, "Factoring status updated successfully", { factoring });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const paymentStatus = req.body?.paymentStatus;
  const paymentStatusError = validatePaymentStatus(paymentStatus);
  if (paymentStatusError) return sendError(res, paymentStatusError, 400);

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  factoring.paymentStatus = paymentStatus;
  if (req.body.paymentDate) factoring.paymentDate = new Date(req.body.paymentDate);
  if (paymentStatus === "Funded") factoring.factoringStatus = "Funded";
  if (paymentStatus === "Paid") factoring.factoringStatus = "Paid";
  if (paymentStatus === "Rejected") factoring.factoringStatus = "Rejected";
  await factoring.save();

  return sendSuccess(res, "Factoring payment status updated successfully", { factoring });
});

export const updateDocumentsStatus = asyncHandler(async (req, res) => {
  const documentsStatus = req.body?.documentsStatus;
  const documentsStatusError = validateDocumentsStatus(documentsStatus);
  if (documentsStatusError) return sendError(res, documentsStatusError, 400);

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  factoring.documentsStatus = documentsStatus;
  await factoring.save();

  return sendSuccess(res, "Factoring documents status updated successfully", { factoring });
});

export const rejectFactoringRecord = asyncHandler(async (req, res) => {
  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  factoring.factoringStatus = "Rejected";
  factoring.paymentStatus = "Rejected";
  factoring.documentsStatus = "Rejected";
  factoring.rejectionReason = String(req.body?.rejectionReason || "").trim();
  await factoring.save();

  return sendSuccess(res, "Factoring record rejected successfully", { factoring });
});

export const addFactoringDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const errors = validateFactoringDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) {
    await cleanupUploadedFile(req.file);
    return null;
  }

  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");

  factoring.documents.push({
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

  factoring.recalculateDocumentsStatus();
  await factoring.save();

  return sendSuccess(res, "Factoring document added successfully", { factoring }, 201);
});

export const deleteFactoringDocument = asyncHandler(async (req, res) => {
  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  const document = factoring.documents.id(req.params.documentId);
  if (!document) return sendError(res, "Factoring document not found", 404);

  document.deleteOne();
  factoring.recalculateDocumentsStatus();
  await factoring.save();

  return sendSuccess(res, "Factoring document deleted successfully", { factoring });
});

export const addFactoringNote = asyncHandler(async (req, res) => {
  const note = String(req.body?.note || "").trim();
  if (!note) return sendError(res, "note is required", 400);

  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  factoring.notes.push({
    note,
    createdBy: req.user?._id || null,
    createdAt: new Date(),
  });
  await factoring.save();

  return sendSuccess(res, "Factoring note added successfully", { factoring }, 201);
});

export const deleteFactoringNote = asyncHandler(async (req, res) => {
  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  const note = factoring.notes.id(req.params.noteId);
  if (!note) return sendError(res, "Factoring note not found", 404);

  note.deleteOne();
  await factoring.save();

  return sendSuccess(res, "Factoring note deleted successfully", { factoring });
});

export const deleteFactoringRecord = asyncHandler(async (req, res) => {
  const factoring = await findFactoringOrSend(req.params.id, res);
  if (!factoring) return null;

  await factoring.deleteOne();

  return sendSuccess(res, "Factoring record deleted successfully", {});
});
