import mongoose from "mongoose";

export const CARRIER_STATUSES = ["Active", "Inactive"];
export const CARRIER_DRIVER_STATUSES = ["Active", "In Transit", "Delivered", "Inactive"];

const carrierDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    fileUrl: { type: String, trim: true, default: "" },
    storage: { type: String, enum: ["local", "s3"], default: "local" },
    s3Key: { type: String, trim: true, default: null },
    bucket: { type: String, trim: true, default: null },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    status: { type: String, trim: true, default: "Valid" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: false }
);

const carrierDriverSchema = new mongoose.Schema(
  {
    driverName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    loadNumber: { type: String, trim: true, default: "" },
    pickup: { type: String, trim: true, default: "" },
    delivery: { type: String, trim: true, default: "" },
    assignedTruck: { type: String, trim: true, default: "" },
    truckType: { type: String, trim: true, default: "" },
    deliveryDate: { type: Date, default: null },
    status: { type: String, enum: CARRIER_DRIVER_STATUSES, default: "Active" },
  },
  { timestamps: false }
);

const assignedLoadSchema = new mongoose.Schema(
  {
    loadNumber: { type: String, trim: true, default: "" },
    customerName: { type: String, trim: true, default: "" },
    pickup: { type: String, trim: true, default: "" },
    delivery: { type: String, trim: true, default: "" },
    driverName: { type: String, trim: true, default: "" },
    assignedTruck: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    deliveryDate: { type: Date, default: null },
    amount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

const carrierSchema = new mongoose.Schema(
  {
    carrierName: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    mcNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    dotNumber: {
      type: String,
      trim: true,
      default: "",
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: CARRIER_STATUSES,
      default: "Active",
    },
    driversCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeLoads: {
      type: Number,
      default: 0,
      min: 0,
    },
    onTimeRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    documents: {
      type: [carrierDocumentSchema],
      default: [],
    },
    drivers: {
      type: [carrierDriverSchema],
      default: [],
    },
    assignedLoads: {
      type: [assignedLoadSchema],
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

carrierSchema.index({ createdAt: -1 });
carrierSchema.index({ status: 1, createdAt: -1 });
carrierSchema.index({ carrierName: 1 });

const Carrier = mongoose.models.Carrier || mongoose.model("Carrier", carrierSchema);

export default Carrier;
