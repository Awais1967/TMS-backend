import dotenv from "dotenv";
import mongoose from "mongoose";

import "../config/dns.js";
import connectDB from "../config/db.js";
import User from "../Models/User.model.js";

dotenv.config({ quiet: true });

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "password123";

const seedAdmin = async () => {
  const dbStatus = await connectDB();

  if (!dbStatus.connected) {
    throw new Error(dbStatus.message || "MongoDB connection is required to seed admin");
  }

  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL }).select("+password");

  if (existingAdmin) {
    existingAdmin.name = "TMS Admin";
    existingAdmin.password = ADMIN_PASSWORD;
    existingAdmin.role = "admin";
    existingAdmin.status = "active";
    await existingAdmin.save();
  } else {
    await User.create({
      name: "TMS Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      status: "active",
    });
  }

  console.log("Admin user seeded successfully");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
