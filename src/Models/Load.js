import mongoose from "mongoose";

export const LOAD_STATUSES = [
  "Open",
  "Assigned",
  "In Transit",
  "Delivered",
  "Ready for Billing",
  "Completed",
  "Cancelled",
];

const stopSchema = new mongoose.Schema(
  {
    location: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    contactNumber: { type: String, trim: true, default: "" },
    date: { type: Date, default: null },
    time: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const loadSchema = new mongoose.Schema(
  {
    loadNumber: {
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
    customerAvatar: {
      type: String,
      trim: true,
      default: "",
    },
    commodity: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    pickup: {
      type: stopSchema,
      default: () => ({}),
    },
    delivery: {
      type: stopSchema,
      default: () => ({}),
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
    status: {
      type: String,
      enum: LOAD_STATUSES,
      default: "Open",
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    eta: {
      type: String,
      trim: true,
      default: "",
    },
    mapImage: {
      type: String,
      trim: true,
      default: "",
    },
    documents: {
      type: Array,
      default: [],
    },
    messages: {
      type: Array,
      default: [],
    },
    notes: {
      type: Array,
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

loadSchema.pre("validate", function calculateTotalCost(next) {
  const rate = Number(this.rate || 0);
  const additionalCharges = Number(this.additionalCharges || 0);
  this.totalCost = rate + additionalCharges;
  next();
});

loadSchema.index({ createdAt: -1 });
loadSchema.index({ status: 1, createdAt: -1 });
loadSchema.index({ customerName: 1 });
loadSchema.index({ carrierName: 1 });

const Load = mongoose.models.Load || mongoose.model("Load", loadSchema);

export default Load;
