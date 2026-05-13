import mongoose from "mongoose";

export const DRIVER_AVAILABILITY_STATUSES = ["Available", "On Load", "Off Duty", "On Break"];

const assignedTruckDetailsSchema = new mongoose.Schema(
  {
    truckId: { type: String, trim: true, default: "" },
    truckType: { type: String, trim: true, default: "" },
    licensePlate: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const assignedLoadDetailsSchema = new mongoose.Schema(
  {
    loadNumber: { type: String, trim: true, default: "" },
    pickup: { type: String, trim: true, default: "" },
    delivery: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    pickupDate: { type: Date, default: null },
    deliveryDate: { type: Date, default: null },
  },
  { timestamps: false }
);

const driverDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "" },
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

const recentActivitySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    date: { type: Date, default: null },
    time: { type: String, trim: true, default: "" },
  },
  { timestamps: false }
);

const performanceSummarySchema = new mongoose.Schema(
  {
    totalLoads: { type: Number, default: 0 },
    totalMiles: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    lateDeliveries: { type: Number, default: 0 },
  },
  { _id: false }
);

const driverSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
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
      required: true,
      lowercase: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    licenseAlert: {
      type: Boolean,
      default: false,
    },
    assignedTruck: {
      type: String,
      trim: true,
      default: "",
    },
    truckType: {
      type: String,
      trim: true,
      default: "",
    },
    assignedLoads: {
      type: Number,
      default: 0,
      min: 0,
    },
    availabilityStatus: {
      type: String,
      enum: DRIVER_AVAILABILITY_STATUSES,
      default: "Available",
    },
    liveLocation: {
      type: String,
      trim: true,
      default: "",
    },
    completedLoads: {
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
    totalMiles: {
      type: Number,
      default: 0,
      min: 0,
    },
    eta: {
      type: String,
      trim: true,
      default: "",
    },
    assignedTruckDetails: {
      type: assignedTruckDetailsSchema,
      default: () => ({}),
    },
    assignedLoadDetails: {
      type: [assignedLoadDetailsSchema],
      default: [],
    },
    documents: {
      type: [driverDocumentSchema],
      default: [],
    },
    recentActivity: {
      type: [recentActivitySchema],
      default: [],
    },
    performanceSummary: {
      type: performanceSummarySchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

driverSchema.index({ createdAt: -1 });
driverSchema.index({ availabilityStatus: 1, createdAt: -1 });
driverSchema.index({ driverName: 1 });

const Driver = mongoose.models.Driver || mongoose.model("Driver", driverSchema);

export default Driver;
