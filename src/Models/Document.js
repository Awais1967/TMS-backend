import mongoose from "mongoose";

export const DOCUMENT_TYPES = [
  "POD",
  "BOL",
  "Lumper Receipt",
  "Invoice",
  "Rate Confirmation",
  "Insurance Certificate",
  "W9 Form",
  "Safety Rating",
  "Driver License",
  "Medical Certificate",
  "Other",
];

export const DOCUMENT_STATUSES = ["Clear", "Blurry", "Pending Check", "Received", "Missing"];
export const RELATED_TYPES = ["load", "carrier", "driver", "truck", "general"];

const documentSchema = new mongoose.Schema(
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
    carrier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      default: null,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    truck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
      default: null,
    },
    relatedType: {
      type: String,
      enum: RELATED_TYPES,
      default: "general",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    storage: {
      type: String,
      enum: ["local", "s3"],
      default: "local",
    },
    s3Key: {
      type: String,
      trim: true,
      default: null,
    },
    bucket: {
      type: String,
      trim: true,
      default: null,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: "Pending Check",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

documentSchema.index({ createdAt: -1 });
documentSchema.index({ loadNumber: 1, createdAt: -1 });
documentSchema.index({ documentType: 1, status: 1 });
documentSchema.index({ relatedType: 1, relatedId: 1 });

const Document = mongoose.models.Document || mongoose.model("Document", documentSchema);

export default Document;
