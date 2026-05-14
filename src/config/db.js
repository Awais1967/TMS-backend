import "./dns.js";
import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL;

  if (!mongoUri) {
    const message = "MongoDB URI is missing. Set MONGO_URI or MONGODB_URI.";
    console.error(message);
    return { connected: false, message };
  }

  if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
    console.warn("MONGO_URI is missing; using MONGODB_URI for now.");
  } else if (!process.env.MONGO_URI && process.env.MONGODB_URL) {
    console.warn("MONGO_URI is missing; using legacy MONGODB_URL for now.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 5000,
    });
    console.log("MongoDB connected successfully");
    return { connected: true };
  } catch (error) {
    const message = error?.message || "MongoDB connection failed";
    console.error(`MongoDB connection failed: ${message}`);
    return { connected: false, message };
  }
};

export default connectDB;
