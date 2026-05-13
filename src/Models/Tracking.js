import mongoose from "mongoose";

export const TRACKING_STATUSES = ["On Time", "Delayed", "Critical"];
export const TRACKING_TYPES = ["Driver App GPS", "ELD Tracking"];

const mapPointsSchema = new mongoose.Schema(
  {
    pickupLat: { type: Number, default: null },
    pickupLng: { type: Number, default: null },
    truckLat: { type: Number, default: null },
    truckLng: { type: Number, default: null },
    deliveryLat: { type: Number, default: null },
    deliveryLng: { type: Number, default: null },
  },
  { _id: false }
);

const trackingSchema = new mongoose.Schema(
  {
    truckId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      default: null,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
      default: "",
    },
    loadId: {
      type: String,
      required: true,
      trim: true,
    },
    load: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Load",
      default: null,
    },
    currentLocation: {
      type: String,
      required: true,
      trim: true,
    },
    eta: {
      type: String,
      trim: true,
      default: "",
    },
    speed: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: TRACKING_STATUSES,
      default: "On Time",
    },
    trackingType: {
      type: String,
      enum: TRACKING_TYPES,
      required: true,
    },
    routeProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    pickup: {
      type: String,
      required: true,
      trim: true,
    },
    delivery: {
      type: String,
      required: true,
      trim: true,
    },
    distance: {
      type: String,
      trim: true,
      default: "",
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    mapPoints: {
      type: mapPointsSchema,
      default: () => ({}),
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

trackingSchema.index({ createdAt: -1 });
trackingSchema.index({ status: 1, createdAt: -1 });
trackingSchema.index({ trackingType: 1, createdAt: -1 });
trackingSchema.index({ lastUpdate: -1 });

const Tracking = mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);

export default Tracking;
