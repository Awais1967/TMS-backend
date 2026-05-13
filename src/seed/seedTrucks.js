import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Truck from "../Models/Truck.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const trucks = [
  {
    driverName: "Mike Davis",
    phone: "(555) 123-4567",
    email: "mike.davis@example.com",
    vehicleNumber: "TRK-1045",
    equipmentTypes: ["Reefer", "Dry Van"],
    activeLoads: 5,
    completedLoads: 342,
    trackingType: "ELD Tracking",
    status: "Active",
    truckType: "Freightliner Cascadia",
    onTimeRate: 97,
    totalRevenue: 457000,
    contactPerson: "Manny Rodriguez",
    address: "1250 Industrial Pkwy, Indianapolis, IN 46214",
    currentLocation: "Phoenix, AZ",
    licensePlate: "ABC-1234",
    assignedLoads: [
      {
        loadNumber: "#M100081561",
        pickup: "Albuquerque, NM",
        delivery: "Coppell, TX",
        driver: "Mike Davis",
        status: "In Transit",
        deliveryDate: makeDate("2026-03-20"),
      },
      {
        loadNumber: "#M100081562",
        pickup: "Chicago, IL",
        delivery: "Nashville, TN",
        driver: "Sarah Johnson",
        status: "In Transit",
        deliveryDate: makeDate("2026-03-18"),
      },
      {
        loadNumber: "#M100081563",
        pickup: "Atlanta, GA",
        delivery: "Miami, FL",
        driver: "Robert Williams",
        status: "Delivered",
        deliveryDate: makeDate("2026-03-15"),
      },
      {
        loadNumber: "#M100081564",
        pickup: "Los Angeles, CA",
        delivery: "Seattle, WA",
        driver: "Jennifer Brown",
        status: "In Transit",
        deliveryDate: makeDate("2026-03-22"),
      },
      {
        loadNumber: "#M100081565",
        pickup: "Houston, TX",
        delivery: "Denver, CO",
        driver: "Mike Davis",
        status: "Assigned",
        deliveryDate: makeDate("2026-03-25"),
      },
    ],
    documents: [
      {
        name: "Insurance Certificate",
        documentType: "Insurance Certificate",
        fileName: "insurance_certificate_2024.pdf",
        originalName: "insurance_certificate_2024.pdf",
        fileUrl: "/uploads/documents/insurance_certificate_2024.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2024-01-15"),
        expiresAt: makeDate("2025-01-15"),
        status: "Valid",
      },
      {
        name: "MC Registration",
        documentType: "MC Registration",
        fileName: "mc_registration.pdf",
        originalName: "mc_registration.pdf",
        fileUrl: "/uploads/documents/mc_registration.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2024-03-10"),
        expiresAt: makeDate("2026-03-10"),
        status: "Valid",
      },
      {
        name: "DOT Certificate",
        documentType: "DOT Certificate",
        fileName: "dot_certificate.pdf",
        originalName: "dot_certificate.pdf",
        fileUrl: "/uploads/documents/dot_certificate.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2024-02-20"),
        expiresAt: makeDate("2025-04-01"),
        status: "Expiring Soon",
      },
      {
        name: "W9 Form",
        documentType: "W9 Form",
        fileName: "w9_form.pdf",
        originalName: "w9_form.pdf",
        fileUrl: "/uploads/documents/w9_form.pdf",
        storage: "local",
        s3Key: null,
        bucket: null,
        mimeType: "application/pdf",
        size: 0,
        uploadedAt: makeDate("2024-01-05"),
        status: "Valid",
      },
    ],
    performanceData: [
      { month: "Jan", value: 45 },
      { month: "Feb", value: 52 },
      { month: "Mar", value: 48 },
      { month: "Apr", value: 61 },
      { month: "May", value: 55 },
      { month: "Jun", value: 67 },
    ],
    trackingConfig: {
      type: "ELD Tracking",
      description: "Real-time tracking via ELD device",
      enabled: true,
    },
  },
  {
    driverName: "Sarah Johnson",
    phone: "(555) 234-5678",
    email: "sarah.johnson@example.com",
    vehicleNumber: "TRK-2031",
    equipmentTypes: ["Dry Van", "Flatbed"],
    activeLoads: 8,
    completedLoads: 280,
    trackingType: "GPS Tracking",
    status: "Active",
    truckType: "Volvo VNL",
    onTimeRate: 95,
    totalRevenue: 390000,
    currentLocation: "Nashville, TN",
    licensePlate: "XYZ-2031",
    trackingConfig: {
      type: "GPS Tracking",
      description: "Real-time tracking via GPS device",
      enabled: true,
    },
  },
  {
    driverName: "Robert Williams",
    phone: "(555) 345-6789",
    email: "robert.williams@example.com",
    vehicleNumber: "TRK-3012",
    equipmentTypes: ["Reefer"],
    activeLoads: 3,
    completedLoads: 198,
    trackingType: "ELD Tracking",
    status: "Active",
    truckType: "Peterbilt 579",
    onTimeRate: 93,
    totalRevenue: 275000,
    currentLocation: "Miami, FL",
    licensePlate: "RBT-3012",
  },
  {
    driverName: "Jennifer Brown",
    phone: "(555) 456-7890",
    email: "jennifer.brown@example.com",
    vehicleNumber: "TRK-4056",
    equipmentTypes: ["Flatbed", "Power Only"],
    activeLoads: 6,
    completedLoads: 310,
    trackingType: "GPS Tracking",
    status: "Active",
    truckType: "Kenworth T680",
    onTimeRate: 96,
    totalRevenue: 420000,
    currentLocation: "Portland, OR",
    licensePlate: "JNB-4056",
  },
  {
    driverName: "Carlos Martinez",
    phone: "(555) 567-8901",
    email: "carlos.martinez@example.com",
    vehicleNumber: "TRK-6078",
    equipmentTypes: ["Dry Van"],
    activeLoads: 0,
    completedLoads: 122,
    trackingType: "ELD Tracking",
    status: "Inactive",
    truckType: "Freightliner Cascadia",
    onTimeRate: 91,
    totalRevenue: 150000,
    currentLocation: "Phoenix, AZ",
    licensePlate: "CAR-6078",
  },
  {
    driverName: "Emily Davis",
    phone: "(555) 678-9012",
    email: "emily.davis@example.com",
    vehicleNumber: "TRK-6079",
    equipmentTypes: ["Reefer", "Dry Van"],
    activeLoads: 4,
    completedLoads: 180,
    trackingType: "GPS Tracking",
    status: "Active",
    truckType: "International LT",
    onTimeRate: 94,
    totalRevenue: 220000,
    currentLocation: "Detroit, MI",
    licensePlate: "EMD-6079",
  },
];

const seedTrucks = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed trucks");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const truck of trucks) {
    await Truck.findOneAndUpdate(
      { vehicleNumber: truck.vehicleNumber },
      {
        $set: {
          assignedLoads: [],
          documents: [],
          performanceData: [],
          ...truck,
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

  console.log(`Seeded ${trucks.length} trucks successfully`);
};

seedTrucks()
  .catch((error) => {
    console.error("Failed to seed trucks:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
