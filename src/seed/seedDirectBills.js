import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import DirectBill from "../Models/DirectBill.js";
import Load from "../Models/Load.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const directBills = [
  {
    loadNumber: "#M100081561",
    routeNumber: "5000093845",
    invoiceNumber: "DB-100081561",
    customerName: "Rapid Industries",
    customerEmail: "ap@rapidindustries.com",
    customerPhone: "(555) 100-1001",
    billingAddress: "100 Rapid Way, Atlanta, GA 30301",
    carrierName: "Lightning Logistics",
    driverName: "Mike Davis",
    truckNumber: "TRK-1045",
    pickup: {
      location: "Albuquerque Warehouse",
      city: "Albuquerque",
      state: "NM",
      date: makeDate("2026-03-15"),
      time: "08:00 AM",
    },
    delivery: {
      location: "Coppell Distribution Center",
      city: "Coppell",
      state: "TX",
      date: makeDate("2026-03-20"),
      time: "04:30 PM",
    },
    commodity: "Electronics",
    weight: 12000,
    invoiceDate: makeDate("2026-03-20"),
    dueDate: makeDate("2026-04-20"),
    paymentTerms: "Net 30",
    charges: {
      baseRate: 2450,
      fuelSurcharge: 250,
      accessorials: 100,
    },
    paidAmount: 0,
    paymentStatus: "Pending",
    billStatus: "Ready to Send",
    disputeStatus: "None",
    invoicePreview: {
      brokerName: "Beasts Logistics",
      brokerAddress: "12223 Logistics Ave",
      contactName: "Manny Rodriguez",
      contactPhone: "(555) 111-2222",
      contactEmail: "dispatch@beastslogistics.com",
      pickupInstructions: "N/A",
      deliveryInstructions: "N/A",
      facilityNotes: "Driver must track and arrive on time.",
      commodityDescription: "Electronics",
      carrierCost: 775,
      legalTerms: "Standard freight and payment terms apply.",
      signatureRequired: true,
    },
    documents: [
      {
        name: "Customer Invoice",
        documentType: "Invoice",
        fileName: "invoice_DB-100081561.pdf",
        originalName: "invoice_DB-100081561.pdf",
        fileUrl: "/uploads/documents/invoice_DB-100081561.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-20"),
        status: "Generated",
      },
      {
        name: "Rate Confirmation",
        documentType: "Rate Confirmation",
        fileName: "rate_confirmation_5000093845.pdf",
        originalName: "rate_confirmation_5000093845.pdf",
        fileUrl: "/uploads/documents/rate_confirmation_5000093845.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2026-03-20"),
        status: "Uploaded",
      },
    ],
  },
  {
    loadNumber: "#M100081562",
    routeNumber: "5000093846",
    invoiceNumber: "DB-100081562",
    customerName: "Whirlpool Corporation",
    customerEmail: "ap@whirlpool.com",
    carrierName: "Lightning Logistics",
    driverName: "Sarah Johnson",
    truckNumber: "TRK-2031",
    pickup: { city: "Black Mountain", state: "NC" },
    delivery: { city: "Hapeville", state: "GA" },
    commodity: "Appliances",
    weight: 18000,
    invoiceDate: makeDate("2026-03-21"),
    dueDate: makeDate("2026-04-21"),
    charges: {
      baseRate: 2124.44,
      fuelSurcharge: 180,
    },
    paidAmount: 2304.44,
    paymentStatus: "Paid",
    billStatus: "Paid",
    disputeStatus: "None",
  },
  {
    loadNumber: "#M100081563",
    routeNumber: "5000093847",
    invoiceNumber: "DB-100081563",
    customerName: "Coca Cola Distribution",
    customerEmail: "accounting@cocacola.example",
    carrierName: "Swift Transportation",
    driverName: "Robert Williams",
    truckNumber: "TRK-3012",
    pickup: { city: "Dallas", state: "TX" },
    delivery: { city: "Atlanta", state: "GA" },
    commodity: "Beverages",
    weight: 22000,
    invoiceDate: makeDate("2026-03-22"),
    dueDate: makeDate("2026-04-22"),
    charges: {
      baseRate: 5834,
      fuelSurcharge: 420,
      accessorials: 150,
    },
    paidAmount: 2500,
    paymentStatus: "Partial",
    billStatus: "Sent",
    disputeStatus: "None",
  },
  {
    loadNumber: "#M100081564",
    routeNumber: "5000093848",
    invoiceNumber: "DB-100081564",
    customerName: "Target Retail",
    customerEmail: "freightap@target.example",
    carrierName: "J.B. Hunt Transport",
    driverName: "Jennifer Brown",
    truckNumber: "TRK-4056",
    pickup: { city: "Chicago", state: "IL" },
    delivery: { city: "Nashville", state: "TN" },
    commodity: "Retail Goods",
    weight: 16000,
    invoiceDate: makeDate("2026-03-23"),
    dueDate: makeDate("2026-04-23"),
    charges: {
      baseRate: 7342,
      fuelSurcharge: 500,
      accessorials: 200,
      detention: 150,
    },
    paidAmount: 0,
    paymentStatus: "Overdue",
    billStatus: "Disputed",
    disputeStatus: "Open",
    disputeReason: "Customer disputes detention charge",
  },
  {
    loadNumber: "#M100081565",
    routeNumber: "5000093849",
    invoiceNumber: "DB-100081565",
    customerName: "Amazon Logistics",
    carrierName: "Werner Enterprises",
    driverName: "Carlos Martinez",
    truckNumber: "TRK-5023",
    pickup: { city: "Los Angeles", state: "CA" },
    delivery: { city: "Seattle", state: "WA" },
    commodity: "Parcels",
    weight: 14000,
    invoiceDate: makeDate("2026-03-24"),
    dueDate: makeDate("2026-04-24"),
    charges: {
      baseRate: 9234,
      fuelSurcharge: 650,
    },
    paidAmount: 0,
    paymentStatus: "Pending",
    billStatus: "Sent",
    disputeStatus: "None",
  },
  {
    loadNumber: "#M100081566",
    routeNumber: "5000093850",
    invoiceNumber: "DB-100081566",
    customerName: "Home Depot Supply",
    carrierName: "Old Dominion",
    driverName: "Emily Davis",
    truckNumber: "TRK-6078",
    pickup: { city: "Houston", state: "TX" },
    delivery: { city: "Denver", state: "CO" },
    commodity: "Building Materials",
    weight: 24000,
    invoiceDate: makeDate("2026-03-25"),
    dueDate: makeDate("2026-04-25"),
    charges: {
      baseRate: 8532,
      fuelSurcharge: 580,
      accessorials: 100,
    },
    paidAmount: 9212,
    paymentStatus: "Paid",
    billStatus: "Paid",
    disputeStatus: "None",
  },
  {
    loadNumber: "#M100081570",
    routeNumber: "5000093851",
    invoiceNumber: "DB-100081570",
    customerName: "Walmart Distribution",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    pickup: { city: "Dallas", state: "TX" },
    delivery: { city: "Atlanta", state: "GA" },
    commodity: "Grocery",
    weight: 21000,
    invoiceDate: makeDate("2026-03-26"),
    dueDate: makeDate("2026-04-26"),
    charges: {
      baseRate: 4200,
      fuelSurcharge: 280,
    },
    paidAmount: 0,
    paymentStatus: "Pending",
    billStatus: "Draft",
    disputeStatus: "None",
  },
  {
    loadNumber: "#M100081574",
    routeNumber: "5000093852",
    invoiceNumber: "DB-100081574",
    customerName: "Fresh Foods Co",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    pickup: { city: "Los Angeles", state: "CA" },
    delivery: { city: "Seattle", state: "WA" },
    commodity: "Produce",
    weight: 20000,
    invoiceDate: makeDate("2026-03-27"),
    dueDate: makeDate("2026-04-27"),
    charges: {
      baseRate: 5000,
      fuelSurcharge: 300,
    },
    paidAmount: 0,
    paymentStatus: "Pending",
    billStatus: "Draft",
    disputeStatus: "None",
  },
];

const seedDirectBills = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed direct bills");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const directBill of directBills) {
    const load = await Load.findOne({ loadNumber: directBill.loadNumber });

    const existingDirectBill = await DirectBill.findOne({ invoiceNumber: directBill.invoiceNumber });
    const directBillDocument = existingDirectBill || new DirectBill();

    directBillDocument.set({
      ...directBill,
      load: load?._id || null,
      createdBy: admin?._id || null,
    });

    await directBillDocument.save();
  }

  console.log(`Seeded ${directBills.length} direct bills successfully`);
};

seedDirectBills()
  .catch((error) => {
    console.error("Failed to seed direct bills:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
