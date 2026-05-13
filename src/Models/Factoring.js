import mongoose from "mongoose";

export const FACTORING_PAYMENT_STATUSES = ["Pending", "Submitted", "Approved", "Funded", "Paid", "Rejected", "Hold"];
export const FACTORING_STATUSES = ["Draft", "Submitted", "Under Review", "Approved", "Funded", "Paid", "Rejected", "Cancelled"];
export const FACTORING_DOCUMENT_STATUSES = ["Missing", "Pending Review", "Complete", "Rejected"];

const factoringDocumentSchema = new mongoose.Schema(
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const factoringSchema = new mongoose.Schema(
  {
    load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Load",
      default: null,
    },
    directBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectBill",
      default: null,
    },
    loadNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    carrierName: {
      type: String,
      required: true,
      trim: true,
    },
    carrierEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    carrierPhone: {
      type: String,
      trim: true,
      default: "",
    },
    mcNumber: {
      type: String,
      trim: true,
      default: "",
    },
    factoringCompany: {
      type: String,
      required: true,
      trim: true,
    },
    factoringCompanyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    factoringCompanyPhone: {
      type: String,
      trim: true,
      default: "",
    },
    factoringCompanyAddress: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    advanceRate: {
      type: Number,
      default: 90,
      min: 0,
      max: 100,
    },
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserveAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    feePercent: {
      type: Number,
      default: 2,
      min: 0,
      max: 100,
    },
    feeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    submissionDate: {
      type: Date,
      required: true,
    },
    expectedPaymentDate: {
      type: Date,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: FACTORING_PAYMENT_STATUSES,
      default: "Pending",
    },
    factoringStatus: {
      type: String,
      enum: FACTORING_STATUSES,
      default: "Draft",
    },
    documentsStatus: {
      type: String,
      enum: FACTORING_DOCUMENT_STATUSES,
      default: "Missing",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: [noteSchema],
      default: [],
    },
    documents: {
      type: [factoringDocumentSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

factoringSchema.methods.recalculateFinancials = function recalculateFinancials() {
  const amount = Number(this.amount || 0);
  this.advanceAmount = amount * (Number(this.advanceRate || 0) / 100);
  this.reserveAmount = Math.max(0, amount - this.advanceAmount);
  this.feeAmount = amount * (Number(this.feePercent || 0) / 100);
  this.netPay = Math.max(0, this.advanceAmount - this.feeAmount);

  if (this.paymentStatus === "Funded") this.factoringStatus = "Funded";
  if (this.paymentStatus === "Paid") this.factoringStatus = "Paid";
  if (this.paymentStatus === "Rejected") this.factoringStatus = "Rejected";
};

factoringSchema.methods.recalculateDocumentsStatus = function recalculateDocumentsStatus() {
  if (this.documentsStatus === "Rejected") return;

  if (!this.documents?.length) {
    this.documentsStatus = "Missing";
    return;
  }

  const documentTypes = new Set(this.documents.map((document) => String(document.documentType || "").toLowerCase()));
  const hasInvoice = documentTypes.has("invoice");
  const hasPodOrBol = documentTypes.has("pod") || documentTypes.has("bol");
  this.documentsStatus = hasInvoice && hasPodOrBol ? "Complete" : "Pending Review";
};

factoringSchema.pre("validate", function calculateFactoring(next) {
  this.recalculateFinancials();
  next();
});

factoringSchema.index({ createdAt: -1 });
factoringSchema.index({ paymentStatus: 1, createdAt: -1 });
factoringSchema.index({ factoringStatus: 1, createdAt: -1 });
factoringSchema.index({ documentsStatus: 1, createdAt: -1 });
factoringSchema.index({ factoringCompany: 1, createdAt: -1 });
factoringSchema.index({ loadNumber: 1 });

const Factoring = mongoose.models.Factoring || mongoose.model("Factoring", factoringSchema);

export default Factoring;
