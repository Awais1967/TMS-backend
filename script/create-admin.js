import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/Models/User.js";
import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure .env loads from project root even when executed inside /script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
configDotenv({ path: path.resolve(__dirname, "../.env") });

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
  if (!uri) {
    throw new Error("Missing MONGO_URI or MONGODB_URL in environment");
  }

  await mongoose.connect(uri);
  const email = "admin1@example.com";
  const passwordPlain = "ChangeMe123!";
  const password = await bcrypt.hash(passwordPlain, 10);

  const admin = await User.findOneAndUpdate(
    { email },
    { username: "Admin One", email, password, role: "admin" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Admin ready:", { email: admin.email, passwordPlain });
  await mongoose.disconnect();
}
run().catch(console.error);
