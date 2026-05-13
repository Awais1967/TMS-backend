import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Carrier from "../Models/Carrier.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const carriers = [
  {
    carrierName: "Queen Cargo Inc",
    phone: "(555) 123-4567",
    email: "dispatch@queencargo.com",
    registrationNumber: "MC-567890",
    mcNumber: "MC-567890",
    dotNumber: "DOT-3485975",
    driversCount: 20,
    activeLoads: 5,
    status: "Active",
    onTimeRate: 96,
    address: "1250 Industrial Pkwy, Indianapolis, IN 46214",
  },
  {
    carrierName: "Midwest Haulers",
    phone: "(555) 345-6789",
    email: "dispatch@midwesthaulers.com",
    registrationNumber: "MC-345678",
    mcNumber: "MC-345678",
    dotNumber: "DOT-2345678",
    driversCount: 28,
    activeLoads: 3,
    status: "Active",
    onTimeRate: 95,
  },
  {
    carrierName: "Pacific Freight Solutions",
    phone: "(555) 345-6789",
    email: "dispatch@pacificfreight.com",
    registrationNumber: "MC-234567",
    mcNumber: "MC-234567",
    dotNumber: "DOT-4567891",
    driversCount: 33,
    activeLoads: 9,
    status: "Active",
    onTimeRate: 97,
  },
  {
    carrierName: "Mountain Express Trucking",
    phone: "(555) 456-7890",
    email: "dispatch@mountainexpress.com",
    registrationNumber: "MC-123456",
    mcNumber: "MC-123456",
    dotNumber: "DOT-6543210",
    driversCount: 43,
    activeLoads: 3,
    status: "Active",
    onTimeRate: 94,
  },
  {
    carrierName: "Southern Star Logistics",
    phone: "(555) 567-8901",
    email: "dispatch@southernstar.com",
    registrationNumber: "MC-567891",
    mcNumber: "MC-567891",
    dotNumber: "DOT-9876543",
    driversCount: 9,
    activeLoads: 0,
    status: "Inactive",
    onTimeRate: 90,
  },
  {
    carrierName: "Swift Transportation",
    phone: "(555) 234-5678",
    email: "dispatch@swift.com",
    registrationNumber: "MC-456789",
    mcNumber: "MC-456789",
    dotNumber: "DOT-1234567",
    driversCount: 5,
    activeLoads: 0,
    status: "Inactive",
    onTimeRate: 96,
    address: "2200 S 75th Ave, Phoenix, AZ 85043",
    documents: [
      {
        name: "Insurance Certificate.pdf",
        type: "Insurance Certificate",
        fileUrl: "/uploads/documents/insurance_certificate.pdf",
        uploadedAt: makeDate("2026-04-15"),
        expiresAt: makeDate("2027-04-15"),
        status: "Valid",
      },
      {
        name: "W9 Form.pdf",
        type: "W9 Form",
        fileUrl: "/uploads/documents/w9_form.pdf",
        uploadedAt: makeDate("2026-04-10"),
        expiresAt: null,
        status: "Valid",
      },
      {
        name: "Safety Rating.pdf",
        type: "Safety Rating",
        fileUrl: "/uploads/documents/safety_rating.pdf",
        uploadedAt: makeDate("2026-03-28"),
        expiresAt: null,
        status: "Valid",
      },
    ],
    drivers: [
      {
        loadNumber: "#M100081561",
        driverName: "Sarah Johnson",
        phone: "(555) 234-5678",
        pickup: "Nashville, TN",
        delivery: "Coppell, TX",
        assignedTruck: "TRK-2031",
        truckType: "Dry Van",
        deliveryDate: makeDate("2026-12-15"),
        status: "Active",
      },
      {
        loadNumber: "#M100081562",
        driverName: "Emily Davis",
        phone: "(555) 678-9012",
        pickup: "Detroit, MI",
        delivery: "Nashville, TN",
        assignedTruck: "TRK-6078",
        truckType: "Flatbed",
        deliveryDate: makeDate("2026-12-15"),
        status: "Active",
      },
      {
        loadNumber: "#M100081563",
        driverName: "Mike Davis",
        phone: "(555) 123-4567",
        pickup: "Phoenix, AZ",
        delivery: "Miami, FL",
        assignedTruck: "TRK-1045",
        truckType: "Reefer",
        deliveryDate: makeDate("2026-12-15"),
        status: "In Transit",
      },
    ],
    assignedLoads: [
      {
        loadNumber: "#M100081561",
        customerName: "Rapid Industries",
        pickup: "Nashville, TN",
        delivery: "Coppell, TX",
        driverName: "Sarah Johnson",
        assignedTruck: "TRK-2031",
        status: "In Transit",
        deliveryDate: makeDate("2026-12-15"),
        amount: 2450,
      },
      {
        loadNumber: "#M100081562",
        customerName: "Whirlpool Corporation",
        pickup: "Detroit, MI",
        delivery: "Nashville, TN",
        driverName: "Emily Davis",
        assignedTruck: "TRK-6078",
        status: "Assigned",
        deliveryDate: makeDate("2026-12-16"),
        amount: 3120,
      },
    ],
  },
];

const seedCarriers = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed carriers");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const carrier of carriers) {
    await Carrier.findOneAndUpdate(
      { mcNumber: carrier.mcNumber },
      {
        $set: {
          documents: [],
          drivers: [],
          assignedLoads: [],
          ...carrier,
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

  console.log(`Seeded ${carriers.length} carriers successfully`);
};

seedCarriers()
  .catch((error) => {
    console.error("Failed to seed carriers:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
