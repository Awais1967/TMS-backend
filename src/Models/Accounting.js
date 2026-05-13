import mongoose from "mongoose";

export const ACCOUNTING_STATUSES = ["Pending", "Invoiced", "Partially Paid", "Paid", "Disputed", "Closed"];
export const CUSTOMER_BILLING_STATUSES = ["Not Invoiced", "Invoiced", "Paid", "Overdue", "Disputed"];
export const CARRIER_PAYMENT_STATUSES = ["Pending", "Approved", "Paid", "Hold", "Disputed"];
export const DISPUTE_STATUSES = ["None", "Open", "Resolved"];

const customerBillingSchema = new mongoose.Schema(
  {
    status: { type: String, enum: CUSTOMER_BILLING_STATUSES, default: "Not Invoiced" },
    invoiceNumber: { type: String, trim: true, default: "" },
    invoiceDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    amount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const carrierPaymentSchema = new mongoose.Schema(
  {
    status: { type: String, enum: CARRIER_PAYMENT_STATUSES, default: "Pending" },
    billNumber: { type: String, trim: true, default: "" },
    dueDate: { type: Date, default: null },
    amount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const accountingSchema = new mongoose.Schema(
  {
    load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Load",
      default: null,
    },
    loadNumber: {
      type: String,
      trim: true,
      default: "",
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    carrierName: {
      type: String,
      trim: true,
      default: "",
    },
    customerBilling: {
      type: customerBillingSchema,
      default: () => ({}),
    },
    carrierPayment: {
      type: carrierPaymentSchema,
      default: () => ({}),
    },
    overallStatus: {
      type: String,
      enum: ACCOUNTING_STATUSES,
      default: "Pending",
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    disputeStatus: {
      type: String,
      enum: DISPUTE_STATUSES,
      default: "None",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

accountingSchema.index({ createdAt: -1 });
accountingSchema.index({ overallStatus: 1, createdAt: -1 });
accountingSchema.index({ disputeStatus: 1, createdAt: -1 });
accountingSchema.index({ loadNumber: 1 });
accountingSchema.index({ invoiceNumber: 1 }, { sparse: true });

const Accounting = mongoose.models.Accounting || mongoose.model("Accounting", accountingSchema);

export default Accounting;
