import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Load from "../Models/Load.js";
import Tracking from "../Models/Tracking.js";
import Truck from "../Models/Truck.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

const loadNumberCandidates = (loadNumber = "") => {
  const value = String(loadNumber || "").trim();
  if (!value) return [];
  const withoutHash = value.replace(/^#/, "");
  return [...new Set([value, withoutHash, `#${withoutHash}`])];
};

const trackingRecords = [
  {
    truckId: "TRK-2041",
    driverName: "Mike Davis",
    driverPhone: "(555) 123-4567",
    loadId: "#M100081561",
    currentLocation: "Phoenix, AZ",
    eta: "4h 30m",
    speed: 65,
    status: "On Time",
    trackingType: "Driver App GPS",
    routeProgress: 68,
    pickup: "Albuquerque, NM",
    delivery: "Coppell, TX",
    distance: "245 mi",
    lastUpdate: minutesAgo(2),
    mapPoints: {
      pickupLat: 35.0844,
      pickupLng: -106.6504,
      truckLat: 33.4484,
      truckLng: -112.074,
      deliveryLat: 32.9546,
      deliveryLng: -97.015,
    },
  },
  {
    truckId: "TRK-3012",
    driverName: "Sarah Johnson",
    driverPhone: "(555) 234-5678",
    loadId: "#M100081562",
    currentLocation: "Nashville, TN",
    eta: "3h 15m",
    speed: 62,
    status: "Delayed",
    trackingType: "Driver App GPS",
    routeProgress: 45,
    pickup: "Chicago, IL",
    delivery: "Nashville, TN",
    distance: "180 mi",
    lastUpdate: minutesAgo(6),
  },
  {
    truckId: "TRK-4056",
    driverName: "Robert Williams",
    driverPhone: "(555) 345-6789",
    loadId: "#M100081563",
    currentLocation: "Dallas, TX",
    eta: "6h 45m",
    speed: 58,
    status: "On Time",
    trackingType: "ELD Tracking",
    routeProgress: 35,
    pickup: "Houston, TX",
    delivery: "Denver, CO",
    distance: "520 mi",
    lastUpdate: minutesAgo(4),
  },
  {
    truckId: "TRK-7089",
    driverName: "Emily Davis",
    driverPhone: "(555) 678-9012",
    loadId: "#M100081564",
    currentLocation: "Charlotte, NC",
    eta: "5h 30m",
    speed: 55,
    status: "Critical",
    trackingType: "ELD Tracking",
    routeProgress: 25,
    pickup: "Atlanta, GA",
    delivery: "Richmond, VA",
    distance: "310 mi",
    lastUpdate: minutesAgo(9),
  },
  {
    truckId: "TRK-6079",
    driverName: "Emily Davis",
    driverPhone: "(555) 678-9012",
    loadId: "#M100081568",
    currentLocation: "Detroit, MI",
    eta: "2h 45m",
    speed: 60,
    status: "On Time",
    trackingType: "Driver App GPS",
    routeProgress: 72,
    pickup: "Phoenix, AZ",
    delivery: "Coppell, TX",
    distance: "160 mi",
    lastUpdate: minutesAgo(3),
  },
  {
    truckId: "TRK-1045",
    driverName: "Mike Davis",
    driverPhone: "(555) 123-4567",
    loadId: "#M100081570",
    currentLocation: "Dallas, TX",
    eta: "1h 50m",
    speed: 63,
    status: "On Time",
    trackingType: "ELD Tracking",
    routeProgress: 82,
    pickup: "Dallas, TX",
    delivery: "Atlanta, GA",
    distance: "95 mi",
    lastUpdate: minutesAgo(1),
  },
];

const seedTracking = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed tracking");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const record of trackingRecords) {
    const [truck, load] = await Promise.all([
      Truck.findOne({ vehicleNumber: record.truckId }),
      Load.findOne({ loadNumber: { $in: loadNumberCandidates(record.loadId) } }),
    ]);

    await Tracking.findOneAndUpdate(
      { truckId: record.truckId },
      {
        $set: {
          ...record,
          truck: truck?._id || null,
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

  console.log(`Seeded ${trackingRecords.length} tracking records successfully`);
};

seedTracking()
  .catch((error) => {
    console.error("Failed to seed tracking:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
