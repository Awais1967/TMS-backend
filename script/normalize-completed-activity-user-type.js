import mongoose from "mongoose";
import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import CompletedActivity from "../src/Models/CompletedActivity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
configDotenv({ path: path.resolve(__dirname, "../.env") });

const legacyUserTypeFilter = [
  { userType: { $exists: false } },
  { userType: null },
];

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
  if (!uri) {
    throw new Error("Missing MONGO_URI or MONGODB_URL in environment");
  }

  await mongoose.connect(uri);

  const userResult = await CompletedActivity.updateMany(
    {
      userId: { $exists: true, $ne: null },
      $or: legacyUserTypeFilter,
    },
    { $set: { userType: "user" } },
  );

  const guestResult = await CompletedActivity.updateMany(
    {
      guestId: { $exists: true, $ne: null },
      $or: legacyUserTypeFilter,
    },
    { $set: { userType: "guest" } },
  );

  console.log("CompletedActivity userType normalization results:");
  console.log({
    usersMatched: userResult.matchedCount,
    usersModified: userResult.modifiedCount,
    guestsMatched: guestResult.matchedCount,
    guestsModified: guestResult.modifiedCount,
  });

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed to normalize CompletedActivity.userType:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exitCode = 1;
});
