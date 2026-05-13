import mongoose from "mongoose";

export const DIRECT_BILL_PAYMENT_STATUSES = ["Pending", "Partial", "Paid", "Overdue", "Cancelled"];
export const DIRECT_BILL_STATUSES = ["Draft", "Ready to Send", "Sent", "Viewed", "Paid", "Disputed", "Void"];
export const DIRECT_BILL_DISPUTE_STATUSES = ["None", "Open", "Under Review", "Resolved"];

const stopSchema = new mongoose.Schema(
  {
    location: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    date: { type: Date, default: null },
    time: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const chargesSchema = new mongoose.Schema(
  {
    baseRate: { type: Number, default: 0, min: 0 },
    fuelSurcharge: { type: Number, default: 0, min: 0 },
    accessorials: { type: Number, default: 0, min: 0 },
    detention: { type: Number, default: 0, min: 0 },
    lumper: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const invoicePreviewSchema = new mongoose.Schema(
  {
    brokerName: { type: String, trim: true, default: "" },
    brokerAddress: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    pickupInstructions: { type: String, trim: true, default: "" },
    deliveryInstructions: { type: String, trim: true, default: "" },
    facilityNotes: { type: String, trim: true, default: "" },
    commodityDescription: { type: String, trim: true, default: "" },
    carrierCost: { type: Number, default: 0, min: 0 },
    legalTerms: { type: String, trim: true, default: "" },
    signatureRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const directBillDocumentSchema = new mongoose.Schema(
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

const directBillSchema = new mongoose.Schema(
  {
    load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Load",
      default: null,
    },
    loadNumber: {
      type: String,
      required: true,
      trim: true,
    },
    routeNumber: {
      type: String,
      trim: true,
      default: "",
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
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    billingAddress: {
      type: String,
      trim: true,
      default: "",
    },
    carrierName: {
      type: String,
      trim: true,
      default: "",
    },
    driverName: {
      type: String,
      trim: true,
      default: "",
    },
    truckNumber: {
      type: String,
      trim: true,
      default: "",
    },
    pickup: {
      type: stopSchema,
      default: () => ({}),
    },
    delivery: {
      type: stopSchema,
      default: () => ({}),
    },
    commodity: {
      type: String,
      trim: true,
      default: "",
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentTerms: {
      type: String,
      trim: true,
      default: "Net 30",
    },
    currency: {
      type: String,
      trim: true,
      default: "USD",
    },
    charges: {
      type: chargesSchema,
      default: () => ({}),
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: DIRECT_BILL_PAYMENT_STATUSES,
      default: "Pending",
    },
    billStatus: {
      type: String,
      enum: DIRECT_BILL_STATUSES,
      default: "Draft",
    },
    disputeStatus: {
      type: String,
      enum: DIRECT_BILL_DISPUTE_STATUSES,
      default: "None",
    },
    disputeReason: {
      type: String,
      trim: true,
      default: "",
    },
    invoicePreview: {
      type: invoicePreviewSchema,
      default: () => ({}),
    },
    documents: {
      type: [directBillDocumentSchema],
      default: [],
    },
    notes: {
      type: [noteSchema],
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

directBillSchema.methods.recalculateTotals = function recalculateTotals() {
  const charges = this.charges || {};
  const subtotal =
    Number(charges.baseRate || 0) +
    Number(charges.fuelSurcharge || 0) +
    Number(charges.accessorials || 0) +
    Number(charges.detention || 0) +
    Number(charges.lumper || 0) +
    Number(charges.otherCharges || 0) -
    Number(charges.discount || 0);

  this.subtotal = Math.max(0, subtotal);
  this.totalAmount = this.subtotal + Number(charges.tax || 0);
  this.balanceDue = Math.max(0, this.totalAmount - Number(this.paidAmount || 0));

  if (this.totalAmount > 0 && Number(this.paidAmount || 0) >= this.totalAmount) {
    this.paymentStatus = "Paid";
  } else if (Number(this.paidAmount || 0) > 0 && this.paymentStatus !== "Cancelled") {
    this.paymentStatus = "Partial";
  }
};

directBillSchema.pre("validate", function calculateDirectBillTotals(next) {
  this.recalculateTotals();
  next();
});

directBillSchema.index({ createdAt: -1 });
directBillSchema.index({ paymentStatus: 1, createdAt: -1 });
directBillSchema.index({ billStatus: 1, createdAt: -1 });
directBillSchema.index({ disputeStatus: 1, createdAt: -1 });
directBillSchema.index({ loadNumber: 1 });

const DirectBill = mongoose.models.DirectBill || mongoose.model("DirectBill", directBillSchema);

export default DirectBill;
