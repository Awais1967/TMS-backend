import mongoose from "mongoose";

export const SETTLEMENT_STATUSES = ["Draft", "Pending Approval", "Approved", "Paid", "Hold", "Rejected", "Cancelled"];
export const SETTLEMENT_APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"];
export const SETTLEMENT_PAYMENT_STATUSES = ["Pending", "Partial", "Paid", "Hold", "Cancelled"];
export const SETTLEMENT_DOCUMENT_STATUSES = ["Missing", "Pending Review", "Complete", "Rejected"];
export const SETTLEMENT_PAYMENT_METHODS = ["ACH", "Check", "Wire", "Cash", "Other"];

const earningsSchema = new mongoose.Schema(
  {
    linehaul: { type: Number, default: 0, min: 0 },
    fuelSurcharge: { type: Number, default: 0, min: 0 },
    accessorials: { type: Number, default: 0, min: 0 },
    detention: { type: Number, default: 0, min: 0 },
    layover: { type: Number, default: 0, min: 0 },
    lumper: { type: Number, default: 0, min: 0 },
    otherPay: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const deductionsSchema = new mongoose.Schema(
  {
    advances: { type: Number, default: 0, min: 0 },
    fuelCard: { type: Number, default: 0, min: 0 },
    insurance: { type: Number, default: 0, min: 0 },
    maintenance: { type: Number, default: 0, min: 0 },
    escrow: { type: Number, default: 0, min: 0 },
    factoringFee: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const settlementPreviewSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: "" },
    companyAddress: { type: String, trim: true, default: "" },
    carrierAddress: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    legalTerms: { type: String, trim: true, default: "" },
    signatureRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const settlementDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    documentType: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    storage: { type: String, enum: ["local", "s3"], default: "local" },
    s3Key: { type: String, trim: true, default: null },
    bucket: { type: String, trim: true, default: null },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    status: { type: String, trim: true, default: "Uploaded" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: false }
);

const noteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const settlementSchema = new mongoose.Schema(
  {
    load: { type: mongoose.Schema.Types.ObjectId, ref: "Load", default: null },
    factoring: { type: mongoose.Schema.Types.ObjectId, ref: "Factoring", default: null },
    directBill: { type: mongoose.Schema.Types.ObjectId, ref: "DirectBill", default: null },
    loadNumber: { type: String, required: true, trim: true },
    settlementNumber: { type: String, required: true, unique: true, trim: true },
    invoiceNumber: { type: String, trim: true, default: "" },
    carrierName: { type: String, required: true, trim: true },
    carrierEmail: { type: String, trim: true, lowercase: true, default: "" },
    carrierPhone: { type: String, trim: true, default: "" },
    mcNumber: { type: String, trim: true, default: "" },
    driverName: { type: String, trim: true, default: "" },
    truckNumber: { type: String, trim: true, default: "" },
    pickup: { type: String, trim: true, default: "" },
    delivery: { type: String, trim: true, default: "" },
    deliveryDate: { type: Date, default: null },
    settlementDate: { type: Date, required: true },
    dueDate: { type: Date, default: null },
    paymentTerms: { type: String, trim: true, default: "Net 15" },
    currency: { type: String, trim: true, default: "USD" },
    earnings: { type: earningsSchema, default: () => ({}) },
    deductions: { type: deductionsSchema, default: () => ({}) },
    totalEarnings: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: SETTLEMENT_STATUSES, default: "Draft" },
    approvalStatus: { type: String, enum: SETTLEMENT_APPROVAL_STATUSES, default: "Pending" },
    paymentStatus: { type: String, enum: SETTLEMENT_PAYMENT_STATUSES, default: "Pending" },
    documentsStatus: { type: String, enum: SETTLEMENT_DOCUMENT_STATUSES, default: "Missing" },
    paymentMethod: { type: String, enum: SETTLEMENT_PAYMENT_METHODS, default: "ACH" },
    paymentReference: { type: String, trim: true, default: "" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "" },
    settlementPreview: { type: settlementPreviewSchema, default: () => ({}) },
    documents: { type: [settlementDocumentSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

settlementSchema.methods.recalculateTotals = function recalculateTotals() {
  const earnings = this.earnings || {};
  const deductions = this.deductions || {};
  this.totalEarnings =
    Number(earnings.linehaul || 0) +
    Number(earnings.fuelSurcharge || 0) +
    Number(earnings.accessorials || 0) +
    Number(earnings.detention || 0) +
    Number(earnings.layover || 0) +
    Number(earnings.lumper || 0) +
    Number(earnings.otherPay || 0);
  this.totalDeductions =
    Number(deductions.advances || 0) +
    Number(deductions.fuelCard || 0) +
    Number(deductions.insurance || 0) +
    Number(deductions.maintenance || 0) +
    Number(deductions.escrow || 0) +
    Number(deductions.factoringFee || 0) +
    Number(deductions.otherDeductions || 0);
  this.netPay = Math.max(0, this.totalEarnings - this.totalDeductions);
  this.balanceDue = Math.max(0, this.netPay - Number(this.paidAmount || 0));

  if (this.netPay > 0 && Number(this.paidAmount || 0) >= this.netPay) {
    this.paymentStatus = "Paid";
    this.status = "Paid";
  } else if (Number(this.paidAmount || 0) > 0 && this.paymentStatus !== "Cancelled") {
    this.paymentStatus = "Partial";
  }

  if (this.approvalStatus === "Approved" && this.status !== "Paid") this.status = "Approved";
  if (this.approvalStatus === "Rejected") this.status = "Rejected";
};

settlementSchema.methods.recalculateDocumentsStatus = function recalculateDocumentsStatus() {
  if (this.documentsStatus === "Rejected") return;
  if (!this.documents?.length) {
    this.documentsStatus = "Missing";
    return;
  }
  const hasCompleteDocument = this.documents.some((document) => ["Uploaded", "Generated", "Complete"].includes(document.status));
  this.documentsStatus = hasCompleteDocument ? "Complete" : "Pending Review";
};

settlementSchema.pre("validate", function calculateSettlement(next) {
  this.recalculateTotals();
  next();
});

settlementSchema.index({ createdAt: -1 });
settlementSchema.index({ status: 1, createdAt: -1 });
settlementSchema.index({ approvalStatus: 1, createdAt: -1 });
settlementSchema.index({ paymentStatus: 1, createdAt: -1 });
settlementSchema.index({ documentsStatus: 1, createdAt: -1 });
settlementSchema.index({ loadNumber: 1 });

const Settlement = mongoose.models.Settlement || mongoose.model("Settlement", settlementSchema);

export default Settlement;
