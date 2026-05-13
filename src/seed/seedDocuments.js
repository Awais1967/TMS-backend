import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Document from "../Models/Document.js";
import Load from "../Models/Load.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const sampleDocuments = [
  {
    loadNumber: "#M100081561",
    documentType: "POD",
    originalName: "POD_31346-9810_signed.pdf",
    fileName: "sample-pod.pdf",
    fileUrl: "/uploads/documents/sample-pod.pdf",
    mimeType: "application/pdf",
    size: 245760,
    status: "Clear",
  },
  {
    loadNumber: "#M100081561",
    documentType: "BOL",
    originalName: "BOL_31346-9810.pdf",
    fileName: "sample-bol.pdf",
    fileUrl: "/uploads/documents/sample-bol.pdf",
    mimeType: "application/pdf",
    size: 198120,
    status: "Clear",
  },
  {
    loadNumber: "#M100081561",
    documentType: "Lumper Receipt",
    originalName: "lumper_receipt_blurry.jpg",
    fileName: "sample-lumper-blurry.jpg",
    fileUrl: "/uploads/documents/sample-lumper-blurry.jpg",
    mimeType: "image/jpeg",
    size: 98120,
    status: "Blurry",
  },
  {
    loadNumber: "#M100081561",
    documentType: "Rate Confirmation",
    originalName: "Rate_Confirmation_Signed.pdf",
    fileName: "sample-rate-confirmation.pdf",
    fileUrl: "/uploads/documents/sample-rate-confirmation.pdf",
    mimeType: "application/pdf",
    size: 176330,
    status: "Clear",
  },
  {
    loadNumber: "#M100081562",
    documentType: "Invoice",
    originalName: "Invoice_31346.pdf",
    fileName: "sample-invoice-31346.pdf",
    fileUrl: "/uploads/documents/sample-invoice-31346.pdf",
    mimeType: "application/pdf",
    size: 155220,
    status: "Received",
  },
  {
    loadNumber: "#M100081563",
    documentType: "BOL",
    originalName: "BOL_M100081563.pdf",
    fileName: "sample-bol-m100081563.pdf",
    fileUrl: "/uploads/documents/sample-bol-m100081563.pdf",
    mimeType: "application/pdf",
    size: 203110,
    status: "Pending Check",
  },
];

const seedDocuments = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed documents");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const sample of sampleDocuments) {
    const load = await Load.findOne({ loadNumber: sample.loadNumber });

    await Document.findOneAndUpdate(
      {
        loadNumber: sample.loadNumber,
        originalName: sample.originalName,
      },
      {
        $set: {
          ...sample,
          load: load?._id || null,
          relatedType: "load",
          relatedId: load?._id || null,
          uploadedBy: admin?._id || null,
          notes: "Seed document",
        },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(`Seeded ${sampleDocuments.length} documents successfully`);
};

seedDocuments()
  .catch((error) => {
    console.error("Failed to seed documents:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
