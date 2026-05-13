import fs from "fs/promises";

import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import DirectBill from "../Models/DirectBill.js";
import Load from "../Models/Load.js";
import { uploadFile } from "../services/storage.service.js";
import {
  isValidDirectBillId,
  validateBillStatus,
  validateDirectBillDocumentPayload,
  validateDirectBillPayload,
  validateDisputeStatus,
  validatePaymentStatus,
} from "../validators/directBill.validator.js";

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
  "totalAmount",
  "balanceDue",
  "invoiceDate",
  "dueDate",
  "paymentStatus",
  "billStatus",
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

const normalizeStopPayload = (stop = {}) =>
  removeUndefined({
    location: stop.location?.trim(),
    city: stop.city?.trim(),
    state: stop.state?.trim(),
    date: stop.date ? new Date(stop.date) : undefined,
    time: stop.time?.trim(),
  });

const normalizeChargesPayload = (charges = {}) =>
  removeUndefined({
    baseRate: charges.baseRate !== undefined ? Number(charges.baseRate) : undefined,
    fuelSurcharge: charges.fuelSurcharge !== undefined ? Number(charges.fuelSurcharge) : undefined,
    accessorials: charges.accessorials !== undefined ? Number(charges.accessorials) : undefined,
    detention: charges.detention !== undefined ? Number(charges.detention) : undefined,
    lumper: charges.lumper !== undefined ? Number(charges.lumper) : undefined,
    otherCharges: charges.otherCharges !== undefined ? Number(charges.otherCharges) : undefined,
    discount: charges.discount !== undefined ? Number(charges.discount) : undefined,
    tax: charges.tax !== undefined ? Number(charges.tax) : undefined,
  });

const normalizeDirectBillPayload = (payload = {}) =>
  removeUndefined({
    loadNumber: payload.loadNumber?.trim(),
    routeNumber: payload.routeNumber?.trim(),
    invoiceNumber: payload.invoiceNumber?.trim(),
    customerName: payload.customerName?.trim(),
    customerEmail: payload.customerEmail?.trim().toLowerCase(),
    customerPhone: payload.customerPhone?.trim(),
    billingAddress: payload.billingAddress?.trim(),
    carrierName: payload.carrierName?.trim(),
    driverName: payload.driverName?.trim(),
    truckNumber: payload.truckNumber?.trim(),
    pickup: payload.pickup ? normalizeStopPayload(payload.pickup) : undefined,
    delivery: payload.delivery ? normalizeStopPayload(payload.delivery) : undefined,
    commodity: payload.commodity?.trim(),
    weight: payload.weight !== undefined ? Number(payload.weight) : undefined,
    invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : undefined,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
    paymentTerms: payload.paymentTerms?.trim(),
    currency: payload.currency?.trim(),
    charges: payload.charges ? normalizeChargesPayload(payload.charges) : undefined,
    paidAmount: payload.paidAmount !== undefined ? Number(payload.paidAmount) : undefined,
    paymentStatus: payload.paymentStatus,
    billStatus: payload.billStatus,
    disputeStatus: payload.disputeStatus,
    disputeReason: payload.disputeReason?.trim(),
    invoicePreview: payload.invoicePreview,
    notes: payload.notes,
  });

const findLoadByNumber = async (loadNumber) => {
  const candidates = loadNumberCandidates(loadNumber);
  if (!candidates.length) return null;
  return Load.findOne({ loadNumber: { $in: candidates } });
};

const applyLoadDefaults = (payload, load) => {
  if (!load) return payload;

  return {
    ...payload,
    load: load._id,
    customerName: payload.customerName || load.customerName,
    carrierName: payload.carrierName ?? load.carrierName,
    driverName: payload.driverName ?? load.driverName,
    truckNumber: payload.truckNumber ?? load.truckNumber,
    pickup: payload.pickup && Object.keys(payload.pickup).length ? payload.pickup : load.pickup,
    delivery: payload.delivery && Object.keys(payload.delivery).length ? payload.delivery : load.delivery,
    commodity: payload.commodity || load.commodity,
    weight: payload.weight !== undefined ? payload.weight : load.weight,
    charges: payload.charges || { baseRate: load.rate || 0 },
  };
};

const buildDirectBillQuery = (query) => {
  const filter = {};

  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.billStatus) filter.billStatus = query.billStatus;
  if (query.disputeStatus) filter.disputeStatus = query.disputeStatus;
  if (query.customerName) filter.customerName = { $regex: escapeRegex(query.customerName), $options: "i" };
  if (query.loadNumber) filter.loadNumber = { $regex: escapeRegex(query.loadNumber), $options: "i" };
  if (query.invoiceNumber) filter.invoiceNumber = { $regex: escapeRegex(query.invoiceNumber), $options: "i" };

  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: "i" };
    filter.$or = [
      { loadNumber: regex },
      { routeNumber: regex },
      { invoiceNumber: regex },
      { customerName: regex },
      { customerEmail: regex },
      { carrierName: regex },
      { driverName: regex },
      { truckNumber: regex },
      { paymentStatus: regex },
      { billStatus: regex },
      { disputeStatus: regex },
    ];
  }

  return filter;
};

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch(() => {});
};

const findDirectBillOrSend = async (id, res) => {
  if (!isValidDirectBillId(id)) {
    sendError(res, "Invalid direct bill id", 400);
    return null;
  }

  const directBill = await DirectBill.findById(id);

  if (!directBill) {
    sendError(res, "Direct bill not found", 404);
    return null;
  }

  return directBill;
};

export const getDirectBills = asyncHandler(async (req, res) => {
  if (req.query.paymentStatus) {
    const paymentStatusError = validatePaymentStatus(req.query.paymentStatus);
    if (paymentStatusError) return sendError(res, paymentStatusError, 400);
  }

  if (req.query.billStatus) {
    const billStatusError = validateBillStatus(req.query.billStatus);
    if (billStatusError) return sendError(res, billStatusError, 400);
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
  const filter = buildDirectBillQuery(req.query);

  const [directBills, total, summaryRows, pendingBills, paidBills, overdueBills, disputedBills] =
    await Promise.all([
      DirectBill.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
      DirectBill.countDocuments(filter),
      DirectBill.aggregate([
        {
          $group: {
            _id: null,
            totalBilled: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalBalance: { $sum: "$balanceDue" },
          },
        },
      ]),
      DirectBill.countDocuments({ paymentStatus: "Pending" }),
      DirectBill.countDocuments({ paymentStatus: "Paid" }),
      DirectBill.countDocuments({ paymentStatus: "Overdue" }),
      DirectBill.countDocuments({ $or: [{ billStatus: "Disputed" }, { disputeStatus: { $in: ["Open", "Under Review"] } }] }),
    ]);

  const summary = summaryRows[0] || {};

  return sendSuccess(res, "Direct bills fetched successfully", {
    directBills,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    summary: {
      totalBilled: summary.totalBilled || 0,
      totalPaid: summary.totalPaid || 0,
      totalBalance: summary.totalBalance || 0,
      pendingBills,
      paidBills,
      overdueBills,
      disputedBills,
    },
  });
});

export const getDirectBillById = asyncHandler(async (req, res) => {
  if (!isValidDirectBillId(req.params.id)) {
    return sendError(res, "Invalid direct bill id", 400);
  }

  const directBill = await DirectBill.findById(req.params.id).populate("load");

  if (!directBill) {
    return sendError(res, "Direct bill not found", 404);
  }

  return sendSuccess(res, "Direct bill fetched successfully", { directBill });
});

export const createDirectBill = asyncHandler(async (req, res) => {
  const errors = validateDirectBillPayload(req.body);
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const normalizedPayload = normalizeDirectBillPayload(req.body);
  const load = await findLoadByNumber(normalizedPayload.loadNumber);
  const payload = applyLoadDefaults(normalizedPayload, load);

  const directBill = await DirectBill.create({
    ...payload,
    createdBy: req.user?._id || null,
  }).catch((error) => {
    if (error?.code === 11000) {
      error.statusCode = 400;
      error.message = "Duplicate invoiceNumber";
    }
    throw error;
  });

  return sendSuccess(res, "Direct bill created successfully", { directBill }, 201);
});

export const updateDirectBill = asyncHandler(async (req, res) => {
  const errors = validateDirectBillPayload(req.body, { partial: true });
  if (errors.length) return sendError(res, errors.join(", "), 400);

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  const payload = normalizeDirectBillPayload(req.body);

  if (payload.loadNumber && payload.loadNumber !== directBill.loadNumber) {
    const load = await findLoadByNumber(payload.loadNumber);
    if (load) payload.load = load._id;
  }

  if (payload.charges) {
    payload.charges = {
      ...directBill.charges?.toObject?.(),
      ...payload.charges,
    };
  }

  Object.assign(directBill, payload);
  await directBill.save();

  return sendSuccess(res, "Direct bill updated successfully", { directBill });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const paymentStatus = req.body?.paymentStatus;
  const paymentStatusError = validatePaymentStatus(paymentStatus);
  if (paymentStatusError) return sendError(res, paymentStatusError, 400);

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  directBill.paymentStatus = paymentStatus;

  if (req.body.paidAmount !== undefined) {
    directBill.paidAmount = Number(req.body.paidAmount);
  } else if (paymentStatus === "Paid") {
    directBill.paidAmount = directBill.totalAmount;
    directBill.billStatus = "Paid";
  }

  await directBill.save();

  return sendSuccess(res, "Direct bill payment status updated successfully", { directBill });
});

export const updateBillStatus = asyncHandler(async (req, res) => {
  const billStatus = req.body?.billStatus;
  const billStatusError = validateBillStatus(billStatus);
  if (billStatusError) return sendError(res, billStatusError, 400);

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  directBill.billStatus = billStatus;
  await directBill.save();

  return sendSuccess(res, "Direct bill status updated successfully", { directBill });
});

export const updatePayment = asyncHandler(async (req, res) => {
  if (req.body?.paidAmount === undefined || !Number.isFinite(Number(req.body.paidAmount))) {
    return sendError(res, "paidAmount must be a number", 400);
  }

  if (req.body.paymentStatus) {
    const paymentStatusError = validatePaymentStatus(req.body.paymentStatus);
    if (paymentStatusError) return sendError(res, paymentStatusError, 400);
  }

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  directBill.paidAmount = Number(req.body.paidAmount);
  if (req.body.paymentStatus) directBill.paymentStatus = req.body.paymentStatus;
  if (directBill.totalAmount > 0 && directBill.paidAmount >= directBill.totalAmount) {
    directBill.paymentStatus = "Paid";
    directBill.billStatus = "Paid";
  }
  await directBill.save();

  return sendSuccess(res, "Direct bill payment updated successfully", { directBill });
});

export const updateDispute = asyncHandler(async (req, res) => {
  const disputeStatus = req.body?.disputeStatus;
  const disputeStatusError = validateDisputeStatus(disputeStatus);
  if (disputeStatusError) return sendError(res, disputeStatusError, 400);

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  directBill.disputeStatus = disputeStatus;
  directBill.disputeReason = String(req.body?.disputeReason || "").trim();

  if (["Open", "Under Review"].includes(disputeStatus)) {
    directBill.billStatus = "Disputed";
  }

  await directBill.save();

  return sendSuccess(res, "Direct bill dispute updated successfully", { directBill });
});

export const addDirectBillDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "File is required", 400);
  }

  const errors = validateDirectBillDocumentPayload(req.body);
  if (errors.length) {
    await cleanupUploadedFile(req.file);
    return sendError(res, errors.join(", "), 400);
  }

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) {
    await cleanupUploadedFile(req.file);
    return null;
  }

  const documentType = String(req.body.documentType || "").trim();
  const storedFile = await uploadFile(req.file, "documents");

  directBill.documents.push({
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

  await directBill.save();

  return sendSuccess(res, "Direct bill document added successfully", { directBill }, 201);
});

export const deleteDirectBillDocument = asyncHandler(async (req, res) => {
  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  const document = directBill.documents.id(req.params.documentId);
  if (!document) return sendError(res, "Direct bill document not found", 404);

  document.deleteOne();
  await directBill.save();

  return sendSuccess(res, "Direct bill document deleted successfully", { directBill });
});

export const addDirectBillNote = asyncHandler(async (req, res) => {
  const note = String(req.body?.note || "").trim();
  if (!note) return sendError(res, "note is required", 400);

  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  directBill.notes.push({
    note,
    createdBy: req.user?._id || null,
    createdAt: new Date(),
  });
  await directBill.save();

  return sendSuccess(res, "Direct bill note added successfully", { directBill }, 201);
});

export const deleteDirectBillNote = asyncHandler(async (req, res) => {
  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  const note = directBill.notes.id(req.params.noteId);
  if (!note) return sendError(res, "Direct bill note not found", 404);

  note.deleteOne();
  await directBill.save();

  return sendSuccess(res, "Direct bill note deleted successfully", { directBill });
});

export const deleteDirectBill = asyncHandler(async (req, res) => {
  const directBill = await findDirectBillOrSend(req.params.id, res);
  if (!directBill) return null;

  await directBill.deleteOne();

  return sendSuccess(res, "Direct bill deleted successfully", {});
});
