import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import DirectBill from "../Models/DirectBill.js";
import Factoring from "../Models/Factoring.js";
import Load from "../Models/Load.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const factoringRecords = [
  {
    loadNumber: "#M100081561",
    invoiceNumber: "FAC-100081561",
    customerName: "Rapid Industries",
    carrierName: "Lightning Logistics",
    carrierEmail: "billing@lightninglogistics.com",
    carrierPhone: "(555) 110-2001",
    mcNumber: "MC-100561",
    factoringCompany: "Apex Capital",
    factoringCompanyEmail: "funding@apexcapital.example",
    amount: 2800,
    advanceRate: 90,
    feePercent: 2,
    submissionDate: makeDate("2026-03-21"),
    expectedPaymentDate: makeDate("2026-03-23"),
    paymentStatus: "Submitted",
    factoringStatus: "Submitted",
    documentsStatus: "Complete",
    documents: [
      {
        name: "Factoring Invoice",
        documentType: "Invoice",
        fileName: "factoring_invoice_FAC-100081561.pdf",
        originalName: "factoring_invoice_FAC-100081561.pdf",
        fileUrl: "/uploads/documents/factoring_invoice_FAC-100081561.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-21"),
        status: "Uploaded",
      },
      {
        name: "Signed POD",
        documentType: "POD",
        fileName: "pod_FAC-100081561.pdf",
        originalName: "pod_FAC-100081561.pdf",
        fileUrl: "/uploads/documents/pod_FAC-100081561.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-21"),
        status: "Uploaded",
      },
      {
        name: "Bill of Lading",
        documentType: "BOL",
        fileName: "bol_FAC-100081561.pdf",
        originalName: "bol_FAC-100081561.pdf",
        fileUrl: "/uploads/documents/bol_FAC-100081561.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-21"),
        status: "Uploaded",
      },
    ],
  },
  {
    loadNumber: "#M100081562",
    invoiceNumber: "FAC-100081562",
    customerName: "Whirlpool Corporation",
    carrierName: "Lightning Logistics",
    mcNumber: "MC-100562",
    factoringCompany: "Triumph Business Capital",
    amount: 2304.44,
    advanceRate: 92,
    feePercent: 2.25,
    submissionDate: makeDate("2026-03-22"),
    expectedPaymentDate: makeDate("2026-03-24"),
    paymentStatus: "Paid",
    factoringStatus: "Paid",
    documentsStatus: "Complete",
    paymentDate: makeDate("2026-03-24"),
  },
  {
    loadNumber: "#M100081563",
    invoiceNumber: "FAC-100081563",
    customerName: "Coca Cola Distribution",
    carrierName: "Swift Transportation",
    mcNumber: "MC-456789",
    factoringCompany: "RTS Financial",
    amount: 6404,
    advanceRate: 90,
    feePercent: 2.5,
    submissionDate: makeDate("2026-03-23"),
    expectedPaymentDate: makeDate("2026-03-25"),
    paymentStatus: "Approved",
    factoringStatus: "Approved",
    documentsStatus: "Complete",
  },
  {
    loadNumber: "#M100081564",
    invoiceNumber: "FAC-100081564",
    customerName: "Target Retail",
    carrierName: "J.B. Hunt Transport",
    mcNumber: "MC-200564",
    factoringCompany: "OTR Capital",
    amount: 8192,
    advanceRate: 88,
    feePercent: 3,
    submissionDate: makeDate("2026-03-24"),
    expectedPaymentDate: makeDate("2026-03-26"),
    paymentStatus: "Hold",
    factoringStatus: "Under Review",
    documentsStatus: "Pending Review",
  },
  {
    loadNumber: "#M100081565",
    invoiceNumber: "FAC-100081565",
    customerName: "Amazon Logistics",
    carrierName: "Werner Enterprises",
    mcNumber: "MC-200565",
    factoringCompany: "Apex Capital",
    amount: 9884,
    advanceRate: 90,
    feePercent: 2,
    submissionDate: makeDate("2026-03-25"),
    expectedPaymentDate: makeDate("2026-03-27"),
    paymentStatus: "Pending",
    factoringStatus: "Draft",
    documentsStatus: "Missing",
  },
  {
    loadNumber: "#M100081566",
    invoiceNumber: "FAC-100081566",
    customerName: "Home Depot Supply",
    carrierName: "Old Dominion",
    mcNumber: "MC-200566",
    factoringCompany: "Triumph Business Capital",
    amount: 9212,
    advanceRate: 92,
    feePercent: 2.25,
    submissionDate: makeDate("2026-03-26"),
    expectedPaymentDate: makeDate("2026-03-28"),
    paymentStatus: "Funded",
    factoringStatus: "Funded",
    documentsStatus: "Complete",
    paymentDate: makeDate("2026-03-28"),
  },
  {
    loadNumber: "#M100081570",
    invoiceNumber: "FAC-100081570",
    customerName: "Walmart Distribution",
    carrierName: "Pending Carrier",
    mcNumber: "",
    factoringCompany: "RTS Financial",
    amount: 4480,
    advanceRate: 90,
    feePercent: 2.5,
    submissionDate: makeDate("2026-03-27"),
    expectedPaymentDate: makeDate("2026-03-29"),
    paymentStatus: "Pending",
    factoringStatus: "Draft",
    documentsStatus: "Missing",
  },
  {
    loadNumber: "#M100081574",
    invoiceNumber: "FAC-100081574",
    customerName: "Fresh Foods Co",
    carrierName: "Pending Carrier",
    mcNumber: "",
    factoringCompany: "OTR Capital",
    amount: 5300,
    advanceRate: 88,
    feePercent: 3,
    submissionDate: makeDate("2026-03-28"),
    expectedPaymentDate: makeDate("2026-03-30"),
    paymentStatus: "Rejected",
    factoringStatus: "Rejected",
    documentsStatus: "Rejected",
    rejectionReason: "Missing signed BOL and invoice mismatch",
  },
];

const seedFactoring = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed factoring");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const record of factoringRecords) {
    const [load, directBill] = await Promise.all([
      Load.findOne({ loadNumber: record.loadNumber }),
      DirectBill.findOne({ invoiceNumber: record.invoiceNumber.replace("FAC-", "DB-") }),
    ]);

    const existingFactoring = await Factoring.findOne({ invoiceNumber: record.invoiceNumber });
    const factoring = existingFactoring || new Factoring();

    factoring.set({
      ...record,
      load: load?._id || null,
      directBill: directBill?._id || null,
      createdBy: admin?._id || null,
    });

    await factoring.save();
  }

  console.log(`Seeded ${factoringRecords.length} factoring records successfully`);
};

seedFactoring()
  .catch((error) => {
    console.error("Failed to seed factoring:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
