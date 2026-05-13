import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Load from "../Models/Load.js";
import Truck from "../Models/Truck.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const needCoverLoads = [
  {
    loadNumber: "#M100081570",
    customerName: "Walmart Distribution",
    commodity: "Grocery",
    weight: 21000,
    pickup: {
      location: "Walmart Dallas DC",
      city: "Dallas",
      state: "TX",
      date: makeDate("2026-11-01"),
      time: "07:00 AM",
    },
    delivery: {
      location: "Atlanta Grocery Hub",
      city: "Atlanta",
      state: "GA",
      date: makeDate("2026-11-03"),
      time: "02:00 PM",
    },
    status: "Open",
    coverStatus: "Need Cover",
    priority: "Critical",
    requiredEquipment: "Reefer",
    pickupWindow: "07:00 AM - 10:00 AM",
    deliveryWindow: "12:00 PM - 03:00 PM",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    rate: 4200,
  },
  {
    loadNumber: "#M100081571",
    customerName: "Pepsi Logistics",
    commodity: "Beverages",
    weight: 19000,
    pickup: {
      location: "Pepsi Phoenix Warehouse",
      city: "Phoenix",
      state: "AZ",
      date: makeDate("2026-11-02"),
      time: "08:30 AM",
    },
    delivery: {
      location: "Denver Beverage Center",
      city: "Denver",
      state: "CO",
      date: makeDate("2026-11-04"),
      time: "01:00 PM",
    },
    status: "Open",
    coverStatus: "Need Cover",
    priority: "High",
    requiredEquipment: "Dry Van",
    pickupWindow: "08:00 AM - 11:00 AM",
    deliveryWindow: "12:00 PM - 04:00 PM",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    rate: 3100,
  },
  {
    loadNumber: "#M100081572",
    customerName: "IKEA Supply",
    commodity: "Furniture",
    weight: 17500,
    pickup: {
      location: "IKEA Chicago DC",
      city: "Chicago",
      state: "IL",
      date: makeDate("2026-11-03"),
      time: "09:00 AM",
    },
    delivery: {
      location: "Nashville Furniture Hub",
      city: "Nashville",
      state: "TN",
      date: makeDate("2026-11-05"),
      time: "03:00 PM",
    },
    status: "Open",
    coverStatus: "Need Cover",
    priority: "Medium",
    requiredEquipment: "Dry Van",
    pickupWindow: "09:00 AM - 12:00 PM",
    deliveryWindow: "02:00 PM - 05:00 PM",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    rate: 2800,
  },
  {
    loadNumber: "#M100081573",
    customerName: "SteelWorks Inc",
    commodity: "Steel Parts",
    weight: 24000,
    pickup: {
      location: "SteelWorks Yard",
      city: "Houston",
      state: "TX",
      date: makeDate("2026-11-04"),
      time: "06:30 AM",
    },
    delivery: {
      location: "OKC Fabrication Plant",
      city: "Oklahoma City",
      state: "OK",
      date: makeDate("2026-11-05"),
      time: "01:30 PM",
    },
    status: "Open",
    coverStatus: "Need Cover",
    priority: "High",
    requiredEquipment: "Flatbed",
    pickupWindow: "06:00 AM - 09:00 AM",
    deliveryWindow: "12:00 PM - 03:00 PM",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    rate: 3600,
  },
  {
    loadNumber: "#M100081574",
    customerName: "Fresh Foods Co",
    commodity: "Produce",
    weight: 20000,
    pickup: {
      location: "Fresh Foods Cold Storage",
      city: "Los Angeles",
      state: "CA",
      date: makeDate("2026-11-05"),
      time: "05:00 AM",
    },
    delivery: {
      location: "Seattle Produce Market",
      city: "Seattle",
      state: "WA",
      date: makeDate("2026-11-07"),
      time: "08:00 AM",
    },
    status: "Open",
    coverStatus: "Need Cover",
    priority: "Critical",
    requiredEquipment: "Reefer",
    pickupWindow: "05:00 AM - 07:00 AM",
    deliveryWindow: "07:00 AM - 10:00 AM",
    carrierName: "",
    driverName: "",
    truckNumber: "",
    rate: 5000,
  },
];

const availableTruckUpdates = [
  {
    vehicleNumber: "TRK-6078",
    driverName: "Carlos Martinez",
    equipmentTypes: ["Dry Van"],
    status: "Active",
    activeLoads: 0,
    currentLocation: "Phoenix, AZ",
  },
  {
    vehicleNumber: "TRK-6079",
    driverName: "Emily Davis",
    equipmentTypes: ["Reefer", "Dry Van"],
    status: "Active",
    activeLoads: 0,
    currentLocation: "Detroit, MI",
  },
  {
    vehicleNumber: "TRK-3012",
    driverName: "Robert Williams",
    equipmentTypes: ["Reefer"],
    status: "Active",
    activeLoads: 1,
    currentLocation: "Miami, FL",
  },
  {
    vehicleNumber: "TRK-4056",
    driverName: "Jennifer Brown",
    equipmentTypes: ["Flatbed", "Power Only"],
    status: "Active",
    activeLoads: 0,
    currentLocation: "Portland, OR",
  },
];

const seedTruckNeedCover = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed Truck Need Cover");
  }

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  for (const load of needCoverLoads) {
    await Load.findOneAndUpdate(
      { loadNumber: load.loadNumber },
      {
        $set: {
          ...load,
          assignment: {},
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

  for (const truck of availableTruckUpdates) {
    await Truck.findOneAndUpdate(
      { vehicleNumber: truck.vehicleNumber },
      { $set: truck },
      { runValidators: true }
    );
  }

  console.log(`Seeded ${needCoverLoads.length} Truck Need Cover loads successfully`);
  console.log(`Updated ${availableTruckUpdates.length} available trucks successfully`);
};

seedTruckNeedCover()
  .catch((error) => {
    console.error("Failed to seed Truck Need Cover:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
