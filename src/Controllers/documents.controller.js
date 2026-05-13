import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Document, { DOCUMENT_STATUSES, DOCUMENT_TYPES, RELATED_TYPES } from "../Models/Document.js";
import Load from "../Models/Load.js";
import { documentsDir } from "../Middleware/upload.middleware.js";
import { uploadFile } from "../services/storage.service.js";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const normalizeLoadNumber = (loadNumber = "") => decodeURIComponent(String(loadNumber || "")).trim();

const loadNumberCandidates = (loadNumber = "") => {
  const value = normalizeLoadNumber(loadNumber);
  if (!value) return [];
  const withoutHash = value.replace(/^#/, "");
  return [...new Set([value, withoutHash, `#${withoutHash}`])];
};

const findLoadByNumber = async (loadNumber) => {
  const candidates = loadNumberCandidates(loadNumber);
  if (!candidates.length) return null;
  return Load.findOne({ loadNumber: { $in: candidates } });
};

const validateDocumentType = (documentType) => {
  if (!DOCUMENT_TYPES.includes(documentType)) {
    return `Invalid documentType. Allowed document types: ${DOCUMENT_TYPES.join(", ")}`;
  }
  return null;
};

const validateStatus = (status) => {
  if (!DOCUMENT_STATUSES.includes(status)) {
    return `Invalid status. Allowed statuses: ${DOCUMENT_STATUSES.join(", ")}`;
  }
  return null;
};

const validateRelatedType = (relatedType) => {
  if (!RELATED_TYPES.includes(relatedType)) {
    return `Invalid relatedType. Allowed related types: ${RELATED_TYPES.join(", ")}`;
  }
  return null;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

const getMockClarityStatus = (originalName) => {
  const lower = String(originalName || "").toLowerCase();
  return lower.includes("blur") || lower.includes("blurry") ? "Blurry" : "Clear";
};

const buildDocumentQuery = (query) => {
  const filter = {};

  if (query.documentType) filter.documentType = query.documentType;
  if (query.status) filter.status = query.status;
  if (query.relatedType) filter.relatedType = query.relatedType;
  if (query.loadNumber) filter.loadNumber = { $in: loadNumberCandidates(query.loadNumber) };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { originalName: regex },
      { fileName: regex },
      { loadNumber: regex },
      { documentType: regex },
      { status: regex },
    ];
  }

  return filter;
};

export const getDocuments = asyncHandler(async (req, res) => {
  if (req.query.documentType) {
    const documentTypeError = validateDocumentType(req.query.documentType);
    if (documentTypeError) return sendError(res, documentTypeError, 400);
  }

  if (req.query.status) {
    const statusError = validateStatus(req.query.status);
    if (statusError) return sendError(res, statusError, 400);
  }

  if (req.query.relatedType) {
    const relatedTypeError = validateRelatedType(req.query.relatedType);
    if (relatedTypeError) return sendError(res, relatedTypeError, 400);
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  const skip = (page - 1) * limit;
  const sortBy = String(req.query.sortBy || "createdAt");
  const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
  const filter = buildDocumentQuery(req.query);

  const [documents, total] = await Promise.all([
    Document.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
    Document.countDocuments(filter),
  ]);

  return sendSuccess(res, "Documents fetched successfully", {
    documents,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getDocumentById = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendError(res, "Invalid document id", 400);
  }

  const document = await Document.findById(req.params.id);

  if (!document) {
    return sendError(res, "Document not found", 404);
  }

  return sendSuccess(res, "Document fetched successfully", { document });
});

export const getDocumentsByLoadNumber = asyncHandler(async (req, res) => {
  const candidates = loadNumberCandidates(req.params.loadNumber);

  if (!candidates.length) {
    return sendError(res, "loadNumber is required", 400);
  }

  const documents = await Document.find({ loadNumber: { $in: candidates } }).sort({ createdAt: -1 }).lean();

  return sendSuccess(res, "Documents fetched successfully", { documents });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const documentType = String(req.body?.documentType || "").trim();
  const documentTypeError = validateDocumentType(documentType);

  if (!documentType) {
    await cleanupUploadedFile(req.file);
    return sendError(res, "documentType is required", 400);
  }

  if (documentTypeError) {
    await cleanupUploadedFile(req.file);
    return sendError(res, documentTypeError, 400);
  }

  const rawRelatedType = String(req.body?.relatedType || "").trim();
  const rawLoadNumber = normalizeLoadNumber(req.body?.loadNumber);
  const relatedType = rawRelatedType || (rawLoadNumber ? "load" : "general");
  const relatedTypeError = validateRelatedType(relatedType);

  if (relatedTypeError) {
    await cleanupUploadedFile(req.file);
    return sendError(res, relatedTypeError, 400);
  }

  const relatedId = String(req.body?.relatedId || "").trim();
  if (relatedId && !isValidObjectId(relatedId)) {
    await cleanupUploadedFile(req.file);
    return sendError(res, "Invalid relatedId", 400);
  }

  const load = rawLoadNumber ? await findLoadByNumber(rawLoadNumber) : null;
  const storedFile = await uploadFile(req.file, "documents");

  const document = await Document.create({
    load: load?._id || null,
    loadNumber: load?.loadNumber || rawLoadNumber,
    relatedType,
    relatedId: relatedId || load?._id || null,
    documentType,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileUrl: storedFile.fileUrl,
    storage: storedFile.storage,
    s3Key: storedFile.s3Key,
    bucket: storedFile.bucket,
    mimeType: req.file.mimetype,
    size: req.file.size,
    status: getMockClarityStatus(req.file.originalname),
    uploadedBy: req.user?._id || null,
    notes: String(req.body?.notes || "").trim(),
  });

  return sendSuccess(res, "Document uploaded successfully", { document }, 201);
});

export const updateDocumentStatus = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendError(res, "Invalid document id", 400);
  }

  const status = String(req.body?.status || "").trim();
  const statusError = validateStatus(status);

  if (statusError) {
    return sendError(res, statusError, 400);
  }

  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!document) {
    return sendError(res, "Document not found", 404);
  }

  return sendSuccess(res, "Document status updated successfully", { document });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendError(res, "Invalid document id", 400);
  }

  const document = await Document.findById(req.params.id);

  if (!document) {
    return sendError(res, "Document not found", 404);
  }

  const relativeFilePath = String(document.fileUrl || "").replace(/^\/+/, "");
  const absoluteFilePath = path.resolve(process.cwd(), relativeFilePath);
  const safeDocumentsDir = path.resolve(documentsDir);

  if (document.storage !== "s3" && absoluteFilePath.startsWith(safeDocumentsDir)) {
    await fs.unlink(absoluteFilePath).catch(() => {});
  }

  await document.deleteOne();

  return sendSuccess(res, "Document deleted successfully", {});
});
