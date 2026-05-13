import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import Load from "../Models/Load.js";

dotenv.config({ quiet: true });

const makeDate = (value) => new Date(`${value}T09:00:00.000Z`);

const loads = [
  {
    loadNumber: "#M100081561",
    customerName: "Rapid Industries",
    customerAvatar: "",
    commodity: "Electronics",
    weight: 12000,
    pickup: {
      location: "Rapid Industries Warehouse",
      city: "Hapeville",
      state: "GA",
      contactName: "Operations Desk",
      contactNumber: "555-0101",
      date: makeDate("2026-10-18"),
      time: "08:00 AM",
    },
    delivery: {
      location: "Ashwaubenon Distribution Center",
      city: "Ashwaubenon",
      state: "WI",
      contactName: "Receiving",
      contactNumber: "555-0102",
      date: makeDate("2026-10-20"),
      time: "04:00 PM",
    },
    eta: "4:19 PM EDT • 79 mi",
    carrierName: "Lightning Logistics",
    driverName: "Mike Davis",
    truckNumber: "TRK-1045",
    status: "Ready for Billing",
    rate: 2450,
    additionalCharges: 0,
  },
  {
    loadNumber: "#M100081562",
    customerName: "Whirlpool Corporation",
    commodity: "Appliances",
    weight: 18000,
    pickup: {
      location: "Whirlpool Dock",
      city: "Black Mountain",
      state: "NC",
      contactName: "Shipping Office",
      contactNumber: "555-0201",
      date: makeDate("2026-10-18"),
      time: "09:30 AM",
    },
    delivery: {
      location: "Hapeville DC",
      city: "Hapeville",
      state: "GA",
      contactName: "Receiving",
      contactNumber: "555-0202",
      date: makeDate("2026-10-19"),
      time: "03:00 PM",
    },
    carrierName: "Lightning Logistics",
    driverName: "Sarah Johnson",
    truckNumber: "TRK-2031",
    status: "In Transit",
    rate: 2124.44,
  },
  {
    loadNumber: "#M100081563",
    customerName: "Coca Cola Distribution",
    commodity: "Beverages",
    weight: 22000,
    pickup: {
      location: "Coca Cola Distribution Center",
      city: "Dallas",
      state: "TX",
      contactName: "Dispatch",
      contactNumber: "555-0301",
      date: makeDate("2026-10-19"),
      time: "07:00 AM",
    },
    delivery: {
      location: "Atlanta Beverage Hub",
      city: "Atlanta",
      state: "GA",
      contactName: "Dock Lead",
      contactNumber: "555-0302",
      date: makeDate("2026-10-21"),
      time: "11:00 AM",
    },
    carrierName: "Swift Transportation",
    driverName: "Robert Williams",
    truckNumber: "TRK-3012",
    status: "Assigned",
    rate: 5834,
  },
  {
    loadNumber: "#M100081564",
    customerName: "Target Retail",
    commodity: "Retail Goods",
    weight: 16000,
    pickup: {
      location: "Target Regional DC",
      city: "Chicago",
      state: "IL",
      contactName: "Target Shipping",
      contactNumber: "555-0401",
      date: makeDate("2026-10-19"),
      time: "10:00 AM",
    },
    delivery: {
      location: "Nashville Retail DC",
      city: "Nashville",
      state: "TN",
      contactName: "Receiving",
      contactNumber: "555-0402",
      date: makeDate("2026-10-20"),
      time: "02:30 PM",
    },
    carrierName: "J.B. Hunt Transport",
    driverName: "Jennifer Brown",
    truckNumber: "TRK-4056",
    status: "Delivered",
    rate: 7342,
  },
  {
    loadNumber: "#M100081565",
    customerName: "Amazon Logistics",
    commodity: "Parcels",
    weight: 14000,
    pickup: {
      location: "Amazon Fulfillment Center",
      city: "Los Angeles",
      state: "CA",
      contactName: "Amazon Dock",
      contactNumber: "555-0501",
      date: makeDate("2026-10-20"),
      time: "06:00 AM",
    },
    delivery: {
      location: "Seattle Sort Center",
      city: "Seattle",
      state: "WA",
      contactName: "Sort Center",
      contactNumber: "555-0502",
      date: makeDate("2026-10-22"),
      time: "08:00 AM",
    },
    carrierName: "Werner Enterprises",
    driverName: "Carlos Martinez",
    truckNumber: "TRK-5023",
    status: "Open",
    rate: 9234,
  },
  {
    loadNumber: "#M100081566",
    customerName: "Home Depot Supply",
    commodity: "Building Materials",
    weight: 24000,
    pickup: {
      location: "Home Depot Supply Yard",
      city: "Houston",
      state: "TX",
      contactName: "Yard Manager",
      contactNumber: "555-0601",
      date: makeDate("2026-10-20"),
      time: "01:00 PM",
    },
    delivery: {
      location: "Denver Building Supply",
      city: "Denver",
      state: "CO",
      contactName: "Receiving Yard",
      contactNumber: "555-0602",
      date: makeDate("2026-10-22"),
      time: "12:00 PM",
    },
    carrierName: "Old Dominion",
    driverName: "Emily Davis",
    truckNumber: "TRK-6078",
    status: "Completed",
    rate: 8532,
  },
  {
    loadNumber: "#M100081567",
    customerName: "Best Buy Logistics",
    commodity: "Electronics",
    weight: 13000,
    pickup: {
      location: "Best Buy Logistics Hub",
      city: "Miami",
      state: "FL",
      contactName: "Shipping",
      contactNumber: "555-0701",
      date: makeDate("2026-10-21"),
      time: "08:30 AM",
    },
    delivery: {
      location: "Portland Electronics DC",
      city: "Portland",
      state: "OR",
      contactName: "Warehouse Lead",
      contactNumber: "555-0702",
      date: makeDate("2026-10-24"),
      time: "05:00 PM",
    },
    carrierName: "Estes Express",
    driverName: "Mike Davis",
    truckNumber: "TRK-2041",
    status: "In Transit",
    rate: 6123,
  },
  {
    loadNumber: "#M100081568",
    customerName: "Costco Freight",
    commodity: "Grocery",
    weight: 20000,
    pickup: {
      location: "Costco Freight Center",
      city: "Phoenix",
      state: "AZ",
      contactName: "Costco Dispatch",
      contactNumber: "555-0801",
      date: makeDate("2026-10-21"),
      time: "05:30 AM",
    },
    delivery: {
      location: "Coppell Grocery DC",
      city: "Coppell",
      state: "TX",
      contactName: "Receiving",
      contactNumber: "555-0802",
      date: makeDate("2026-10-23"),
      time: "10:00 AM",
    },
    carrierName: "Knight Transportation",
    driverName: "Sarah Johnson",
    truckNumber: "TRK-6079",
    status: "Assigned",
    rate: 3120,
  },
];

const seedLoads = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed loads");
  }

  for (const load of loads) {
    await Load.findOneAndUpdate(
      { loadNumber: load.loadNumber },
      { $set: load },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${loads.length} loads successfully`);
};

seedLoads()
  .catch((error) => {
    console.error("Failed to seed loads:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
