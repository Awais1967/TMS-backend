import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import DirectBill from "../Models/DirectBill.js";
import Factoring from "../Models/Factoring.js";
import Load from "../Models/Load.js";
import Settlement from "../Models/Settlement.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const settlements = [
  {
    loadNumber: "#M100081561",
    settlementNumber: "SET-100081561",
    invoiceNumber: "INV-100081561",
    carrierName: "Lightning Logistics",
    carrierEmail: "billing@lightninglogistics.com",
    carrierPhone: "(555) 110-2001",
    mcNumber: "MC-100561",
    driverName: "Mike Davis",
    truckNumber: "TRK-1045",
    pickup: "Albuquerque, NM",
    delivery: "Coppell, TX",
    deliveryDate: makeDate("2026-03-20"),
    settlementDate: makeDate("2026-03-21"),
    dueDate: makeDate("2026-04-05"),
    paymentTerms: "Net 15",
    earnings: { linehaul: 1800, fuelSurcharge: 180, accessorials: 50 },
    deductions: {},
    paidAmount: 0,
    status: "Pending Approval",
    approvalStatus: "Pending",
    paymentStatus: "Pending",
    documentsStatus: "Complete",
    settlementPreview: {
      companyName: "Beasts Logistics",
      companyAddress: "12223 Logistics Ave",
      carrierAddress: "1250 Industrial Pkwy, Indianapolis, IN 46214",
      contactName: "Manny Rodriguez",
      contactPhone: "(555) 111-2222",
      contactEmail: "accounting@beastslogistics.com",
      legalTerms: "Settlement is subject to document verification and carrier agreement terms.",
      signatureRequired: true,
    },
    documents: [
      {
        name: "Settlement Statement",
        documentType: "Settlement Statement",
        fileName: "settlement_SET-100081561.pdf",
        originalName: "settlement_SET-100081561.pdf",
        fileUrl: "/uploads/documents/settlement_SET-100081561.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-21"),
        status: "Generated",
      },
      {
        name: "Carrier Invoice",
        documentType: "Carrier Invoice",
        fileName: "carrier_invoice_SET-100081561.pdf",
        originalName: "carrier_invoice_SET-100081561.pdf",
        fileUrl: "/uploads/documents/carrier_invoice_SET-100081561.pdf",
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
    settlementNumber: "SET-100081562",
    invoiceNumber: "INV-100081562",
    carrierName: "Lightning Logistics",
    driverName: "Sarah Johnson",
    truckNumber: "TRK-2031",
    pickup: "Black Mountain, NC",
    delivery: "Hapeville, GA",
    deliveryDate: makeDate("2026-03-21"),
    settlementDate: makeDate("2026-03-22"),
    earnings: { linehaul: 1600, fuelSurcharge: 120 },
    deductions: {},
    paidAmount: 1720,
    status: "Paid",
    approvalStatus: "Approved",
    paymentStatus: "Paid",
    documentsStatus: "Complete",
    paymentMethod: "ACH",
    paymentReference: "ACH-100081562",
  },
  {
    loadNumber: "#M100081563",
    settlementNumber: "SET-100081563",
    invoiceNumber: "INV-100081563",
    carrierName: "Swift Transportation",
    mcNumber: "MC-456789",
    driverName: "Robert Williams",
    truckNumber: "TRK-3012",
    pickup: "Dallas, TX",
    delivery: "Atlanta, GA",
    settlementDate: makeDate("2026-03-23"),
    earnings: { linehaul: 4200, fuelSurcharge: 300, accessorials: 100 },
    deductions: { advances: 200, factoringFee: 0 },
    paidAmount: 0,
    status: "Approved",
    approvalStatus: "Approved",
    paymentStatus: "Pending",
    documentsStatus: "Complete",
  },
  {
    loadNumber: "#M100081564",
    settlementNumber: "SET-100081564",
    invoiceNumber: "INV-100081564",
    carrierName: "J.B. Hunt Transport",
    driverName: "Jennifer Brown",
    truckNumber: "TRK-4056",
    pickup: "Chicago, IL",
    delivery: "Nashville, TN",
    settlementDate: makeDate("2026-03-24"),
    earnings: { linehaul: 6100, fuelSurcharge: 350, accessorials: 120, detention: 150 },
    deductions: { fuelCard: 250 },
    paidAmount: 0,
    status: "Hold",
    approvalStatus: "Pending",
    paymentStatus: "Hold",
    documentsStatus: "Pending Review",
  },
  {
    loadNumber: "#M100081565",
    settlementNumber: "SET-100081565",
    invoiceNumber: "INV-100081565",
    carrierName: "Werner Enterprises",
    driverName: "Carlos Martinez",
    truckNumber: "TRK-5023",
    pickup: "Los Angeles, CA",
    delivery: "Seattle, WA",
    settlementDate: makeDate("2026-03-25"),
    earnings: { linehaul: 7800, fuelSurcharge: 450 },
    deductions: { fuelCard: 300, insurance: 50 },
    paidAmount: 0,
    status: "Draft",
    approvalStatus: "Pending",
    paymentStatus: "Pending",
    documentsStatus: "Missing",
  },
  {
    loadNumber: "#M100081566",
    settlementNumber: "SET-100081566",
    invoiceNumber: "INV-100081566",
    carrierName: "Old Dominion",
    driverName: "Emily Davis",
    truckNumber: "TRK-6078",
    pickup: "Houston, TX",
    delivery: "Denver, CO",
    settlementDate: makeDate("2026-03-26"),
    earnings: { linehaul: 7000, fuelSurcharge: 420, accessorials: 50 },
    deductions: {},
    paidAmount: 7470,
    status: "Paid",
    approvalStatus: "Approved",
    paymentStatus: "Paid",
    documentsStatus: "Complete",
  },
  {
    loadNumber: "#M100081570",
    settlementNumber: "SET-100081570",
    invoiceNumber: "INV-100081570",
    carrierName: "Pending Carrier",
    driverName: "",
    truckNumber: "",
    pickup: "Dallas, TX",
    delivery: "Atlanta, GA",
    settlementDate: makeDate("2026-03-27"),
    earnings: { linehaul: 0, fuelSurcharge: 0 },
    deductions: { advances: 0 },
    paidAmount: 0,
    status: "Draft",
    approvalStatus: "Pending",
    paymentStatus: "Pending",
    documentsStatus: "Missing",
  },
  {
    loadNumber: "#M100081574",
    settlementNumber: "SET-100081574",
    invoiceNumber: "INV-100081574",
    carrierName: "Pending Carrier",
    driverName: "",
    truckNumber: "",
    pickup: "Los Angeles, CA",
    delivery: "Seattle, WA",
    settlementDate: makeDate("2026-03-28"),
    earnings: { linehaul: 0, fuelSurcharge: 0 },
    deductions: { advances: 0 },
    paidAmount: 0,
    status: "Rejected",
    approvalStatus: "Rejected",
    paymentStatus: "Cancelled",
    documentsStatus: "Rejected",
    rejectionReason: "Carrier assignment missing",
  },
];

const seedSettlements = async () => {
  const dbStatus = await connectDB();
  if (!dbStatus.connected) throw new Error(dbStatus.message || "MongoDB connection is required to seed settlements");

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const record of settlements) {
    const [load, directBill, factoring] = await Promise.all([
      Load.findOne({ loadNumber: record.loadNumber }),
      DirectBill.findOne({ invoiceNumber: record.invoiceNumber?.replace("INV-", "DB-") }),
      Factoring.findOne({ invoiceNumber: record.invoiceNumber?.replace("INV-", "FAC-") }),
    ]);

    const existingSettlement = await Settlement.findOne({ settlementNumber: record.settlementNumber });
    const settlement = existingSettlement || new Settlement();
    settlement.set({
      ...record,
      load: load?._id || null,
      directBill: directBill?._id || null,
      factoring: factoring?._id || null,
      createdBy: admin?._id || null,
    });
    await settlement.save();
  }

  console.log(`Seeded ${settlements.length} settlements successfully`);
};

seedSettlements()
  .catch((error) => {
    console.error("Failed to seed settlements:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
