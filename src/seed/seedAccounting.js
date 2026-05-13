import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import Accounting from "../Models/Accounting.js";
import Load from "../Models/Load.js";
import User from "../Models/User.model.js";
import connectDB from "../config/db.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const accountingRecords = [
  {
    loadNumber: "#M100081561",
    customerName: "Rapid Industries",
    carrierName: "Lightning Logistics",
    invoiceNumber: "INV-100081561",
    amount: 2450,
    overallStatus: "Paid",
    disputeStatus: "None",
    customerBilling: {
      status: "Paid",
      invoiceNumber: "INV-100081561",
      invoiceDate: makeDate("2026-10-21"),
      dueDate: makeDate("2026-11-20"),
      amount: 2450,
      paidAt: makeDate("2026-10-29"),
    },
    carrierPayment: {
      status: "Paid",
      billNumber: "BILL-100081561",
      dueDate: makeDate("2026-11-05"),
      amount: 1850,
      paidAt: makeDate("2026-10-30"),
    },
  },
  {
    loadNumber: "#M100081562",
    customerName: "Whirlpool Corporation",
    carrierName: "Lightning Logistics",
    invoiceNumber: "INV-100081562",
    amount: 2124.44,
    overallStatus: "Invoiced",
    disputeStatus: "None",
    customerBilling: {
      status: "Invoiced",
      invoiceNumber: "INV-100081562",
      invoiceDate: makeDate("2026-10-20"),
      dueDate: makeDate("2026-11-19"),
      amount: 2124.44,
    },
    carrierPayment: {
      status: "Approved",
      billNumber: "BILL-100081562",
      dueDate: makeDate("2026-11-03"),
      amount: 1600,
    },
  },
  {
    loadNumber: "#M100081563",
    customerName: "Coca Cola Distribution",
    carrierName: "Swift Transportation",
    invoiceNumber: "INV-100081563",
    amount: 5834,
    overallStatus: "Pending",
    disputeStatus: "None",
    customerBilling: {
      status: "Not Invoiced",
      invoiceNumber: "",
      amount: 5834,
    },
    carrierPayment: {
      status: "Pending",
      billNumber: "BILL-100081563",
      dueDate: makeDate("2026-11-08"),
      amount: 4100,
    },
  },
  {
    loadNumber: "#M100081564",
    customerName: "Target Retail",
    carrierName: "J.B. Hunt Transport",
    invoiceNumber: "INV-100081564",
    amount: 7342,
    overallStatus: "Disputed",
    disputeStatus: "Open",
    customerBilling: {
      status: "Disputed",
      invoiceNumber: "INV-100081564",
      invoiceDate: makeDate("2026-10-21"),
      dueDate: makeDate("2026-11-20"),
      amount: 7342,
    },
    carrierPayment: {
      status: "Hold",
      billNumber: "BILL-100081564",
      dueDate: makeDate("2026-11-06"),
      amount: 5200,
    },
    notes: "Customer disputes detention charge.",
  },
  {
    loadNumber: "#M100081565",
    customerName: "Amazon Logistics",
    carrierName: "Werner Enterprises",
    invoiceNumber: "INV-100081565",
    amount: 9234,
    overallStatus: "Partially Paid",
    disputeStatus: "None",
    customerBilling: {
      status: "Invoiced",
      invoiceNumber: "INV-100081565",
      invoiceDate: makeDate("2026-10-23"),
      dueDate: makeDate("2026-11-22"),
      amount: 9234,
    },
    carrierPayment: {
      status: "Paid",
      billNumber: "BILL-100081565",
      dueDate: makeDate("2026-11-09"),
      amount: 6800,
      paidAt: makeDate("2026-10-28"),
    },
  },
  {
    loadNumber: "#M100081566",
    customerName: "Home Depot Supply",
    carrierName: "Old Dominion",
    invoiceNumber: "INV-100081566",
    amount: 8532,
    overallStatus: "Closed",
    disputeStatus: "Resolved",
    customerBilling: {
      status: "Paid",
      invoiceNumber: "INV-100081566",
      invoiceDate: makeDate("2026-10-23"),
      dueDate: makeDate("2026-11-22"),
      amount: 8532,
      paidAt: makeDate("2026-11-01"),
    },
    carrierPayment: {
      status: "Paid",
      billNumber: "BILL-100081566",
      dueDate: makeDate("2026-11-10"),
      amount: 6200,
      paidAt: makeDate("2026-11-02"),
    },
    notes: "Resolved accessorial dispute and closed record.",
  },
  {
    loadNumber: "#M100081570",
    customerName: "Walmart Distribution",
    carrierName: "",
    invoiceNumber: "",
    amount: 4200,
    overallStatus: "Pending",
    disputeStatus: "None",
    customerBilling: {
      status: "Not Invoiced",
      amount: 4200,
    },
    carrierPayment: {
      status: "Pending",
      amount: 0,
    },
  },
  {
    loadNumber: "#M100081574",
    customerName: "Fresh Foods Co",
    carrierName: "",
    invoiceNumber: "",
    amount: 5000,
    overallStatus: "Pending",
    disputeStatus: "None",
    customerBilling: {
      status: "Not Invoiced",
      amount: 5000,
    },
    carrierPayment: {
      status: "Pending",
      amount: 0,
    },
  },
];

const seedAccounting = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed accounting");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const record of accountingRecords) {
    const load = await Load.findOne({ loadNumber: record.loadNumber });

    await Accounting.findOneAndUpdate(
      { loadNumber: record.loadNumber },
      {
        $set: {
          ...record,
          load: load?._id || null,
          createdBy: admin?._id || null,
        },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(`Seeded ${accountingRecords.length} accounting records successfully`);
};

seedAccounting()
  .catch((error) => {
    console.error("Failed to seed accounting:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
