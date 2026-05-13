import mongoose from "mongoose";

export const TRUCK_TRACKING_TYPES = ["ELD Tracking", "GPS Tracking", "Phone GPS"];
export const TRUCK_STATUSES = ["Active", "Inactive", "Maintenance"];

const assignedLoadSchema = new mongoose.Schema(
  {
    loadNumber: { type: String, trim: true, default: "" },
    pickup: { type: String, trim: true, default: "" },
    delivery: { type: String, trim: true, default: "" },
    driver: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    deliveryDate: { type: Date, default: null },
  },
  { timestamps: false }
);

const truckDocumentSchema = new mongoose.Schema(
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
    status: { type: String, trim: true, default: "Valid" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: false }
);

const performanceDataSchema = new mongoose.Schema(
  {
    month: { type: String, trim: true, default: "" },
    value: { type: Number, default: 0 },
  },
  { timestamps: false }
);

const trackingConfigSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const truckSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    driverAvatar: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    equipmentTypes: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "equipmentTypes must not be empty",
      },
    },
    activeLoads: {
      type: Number,
      default: 0,
      min: 0,
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
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    trackingType: {
      type: String,
      enum: TRUCK_TRACKING_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: TRUCK_STATUSES,
      default: "Active",
    },
    truckType: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    currentLocation: {
      type: String,
      trim: true,
      default: "",
    },
    licensePlate: {
      type: String,
      trim: true,
      default: "",
    },
    assignedLoads: {
      type: [assignedLoadSchema],
      default: [],
    },
    documents: {
      type: [truckDocumentSchema],
      default: [],
    },
    performanceData: {
      type: [performanceDataSchema],
      default: [],
    },
    trackingConfig: {
      type: trackingConfigSchema,
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

truckSchema.index({ createdAt: -1 });
truckSchema.index({ status: 1, createdAt: -1 });
truckSchema.index({ trackingType: 1, createdAt: -1 });

const Truck = mongoose.models.Truck || mongoose.model("Truck", truckSchema);

export default Truck;
