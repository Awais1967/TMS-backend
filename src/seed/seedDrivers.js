import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Driver from "../Models/Driver.js";
import User from "../Models/User.model.js";
import { calculateLicenseAlert } from "../Controllers/drivers.controller.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const drivers = [
  {
    driverName: "Mike Davis",
    phone: "(555) 123-4567",
    email: "mike.davis@example.com",
    licenseNumber: "DL-987654321",
    assignedTruck: "TRK-1045",
    truckType: "Reefer",
    assignedLoads: 5,
    availabilityStatus: "On Load",
    liveLocation: "Phoenix, AZ",
    licenseExpiry: makeDate("2026-12-15"),
    completedLoads: 342,
    onTimeRate: 97,
    totalMiles: 456800,
    eta: "2h 15min",
    assignedTruckDetails: {
      truckId: "TRK-1045",
      truckType: "Freightliner Cascadia - Reefer",
      licensePlate: "ABC-1234",
      status: "Active",
    },
    assignedLoadDetails: [
      {
        loadNumber: "#M100081561",
        pickup: "Albuquerque, NM",
        delivery: "Coppell, TX",
        status: "In Transit",
        pickupDate: makeDate("2026-03-15"),
        deliveryDate: makeDate("2026-03-20"),
      },
      {
        loadNumber: "#M100081562",
        pickup: "Los Angeles, CA",
        delivery: "Seattle, WA",
        status: "Assigned",
        pickupDate: makeDate("2026-03-18"),
        deliveryDate: makeDate("2026-03-22"),
      },
    ],
    documents: [
      {
        name: "Driver License",
        fileName: "driver_license.pdf",
        type: "Driver License",
        fileUrl: "/uploads/documents/driver_license.pdf",
        uploadedAt: makeDate("2025-06-10"),
        expiresAt: makeDate("2026-12-15"),
        status: "Valid",
      },
      {
        name: "Medical Certificate",
        fileName: "medical_certificate.pdf",
        type: "Medical Certificate",
        fileUrl: "/uploads/documents/medical_certificate.pdf",
        uploadedAt: makeDate("2024-02-05"),
        expiresAt: makeDate("2025-02-05"),
        status: "Expiring Soon",
      },
      {
        name: "ID Document",
        fileName: "id_document.pdf",
        type: "ID Document",
        fileUrl: "/uploads/documents/id_document.pdf",
        uploadedAt: makeDate("2024-01-03"),
        status: "Valid",
      },
      {
        name: "Training Certificate",
        fileName: "training_cert.pdf",
        type: "Training Certificate",
        fileUrl: "/uploads/documents/training_cert.pdf",
        uploadedAt: makeDate("2025-03-01"),
        status: "Valid",
      },
    ],
    recentActivity: [
      {
        title: "Load Picked Up",
        location: "Albuquerque, NM",
        date: makeDate("2026-03-15"),
        time: "03:30 AM",
      },
      {
        title: "En Route to Destination",
        location: "Phoenix, AZ",
        date: makeDate("2026-03-15"),
        time: "02:45 PM",
      },
      {
        title: "Load Delivered",
        location: "Houston, TX",
        date: makeDate("2026-03-12"),
        time: "04:15 PM",
      },
    ],
    performanceSummary: {
      totalLoads: 342,
      totalMiles: 456800,
      onTimeDeliveries: 97,
      lateDeliveries: 12,
    },
  },
  {
    driverName: "Sarah Johnson",
    phone: "(555) 234-5678",
    email: "sarah.johnson@example.com",
    licenseNumber: "DL-123456789",
    assignedTruck: "TRK-2031",
    truckType: "Dry Van",
    assignedLoads: 4,
    availabilityStatus: "Available",
    liveLocation: "Nashville, TN",
    licenseExpiry: makeDate("2025-08-22"),
    completedLoads: 260,
    onTimeRate: 95,
    totalMiles: 330000,
  },
  {
    driverName: "Robert Williams",
    phone: "(555) 345-6789",
    email: "robert.williams@example.com",
    licenseNumber: "DL-555777999",
    assignedTruck: "TRK-3012",
    truckType: "Flatbed",
    assignedLoads: 2,
    availabilityStatus: "Off Duty",
    liveLocation: "Miami, FL",
    licenseExpiry: makeDate("2025-09-22"),
    completedLoads: 198,
    onTimeRate: 93,
    totalMiles: 270000,
  },
  {
    driverName: "Jennifer Brown",
    phone: "(555) 456-7890",
    email: "jennifer.brown@example.com",
    licenseNumber: "DL-444888222",
    assignedTruck: "TRK-4056",
    truckType: "Reefer",
    assignedLoads: 5,
    availabilityStatus: "On Load",
    liveLocation: "Portland, OR",
    licenseExpiry: makeDate("2026-12-15"),
    completedLoads: 310,
    onTimeRate: 96,
    totalMiles: 410000,
  },
  {
    driverName: "Carlos Martinez",
    phone: "(555) 567-8901",
    email: "carlos.martinez@example.com",
    licenseNumber: "DL-222333444",
    assignedTruck: "TRK-5023",
    truckType: "Dry Van",
    assignedLoads: 0,
    availabilityStatus: "On Break",
    liveLocation: "Phoenix, AZ",
    licenseExpiry: makeDate("2026-12-15"),
    completedLoads: 122,
    onTimeRate: 91,
    totalMiles: 150000,
  },
  {
    driverName: "Emily Davis",
    phone: "(555) 678-9012",
    email: "emily.davis@example.com",
    licenseNumber: "DL-999666333",
    assignedTruck: "TRK-6078",
    truckType: "Flatbed",
    assignedLoads: 1,
    availabilityStatus: "Available",
    liveLocation: "Detroit, MI",
    licenseExpiry: makeDate("2025-09-22"),
    completedLoads: 180,
    onTimeRate: 94,
    totalMiles: 220000,
  },
];

const seedDrivers = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed drivers");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const driver of drivers) {
    await Driver.findOneAndUpdate(
      { licenseNumber: driver.licenseNumber },
      {
        $set: {
          assignedLoadDetails: [],
          documents: [],
          recentActivity: [],
          ...driver,
          licenseAlert: calculateLicenseAlert(driver.licenseExpiry),
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

  console.log(`Seeded ${drivers.length} drivers successfully`);
};

seedDrivers()
  .catch((error) => {
    console.error("Failed to seed drivers:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
