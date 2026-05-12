import mongoose from "mongoose";

const ensureUserIndexes = async () => {
  try {
    const { default: User } = await import("../Models/User.js");
    const indexes = await User.collection.indexes();

    const legacyGoogleIndex = indexes.find(
      (idx) => idx.name === "googleId_1" && idx.unique && !idx.partialFilterExpression
    );
    if (legacyGoogleIndex) {
      await User.collection.dropIndex("googleId_1");
      console.log("Dropped legacy googleId unique index that blocked null values.");
    }

    const desiredName = "googleId_unique_when_string";
    const hasDesired = indexes.some(
      (idx) =>
        idx.name === desiredName &&
        idx.unique === true &&
        idx.partialFilterExpression?.googleId?.$type === "string"
    );
// s
    if (!hasDesired) {
      await User.collection.createIndex(
        { googleId: 1 },
        {
          name: desiredName,
          unique: true,
          partialFilterExpression: { googleId: { $type: "string" } },
        }
      );
      console.log("Ensured googleId partial unique index (strings only).");
    }
  } catch (error) {
    console.warn("Index sync skipped:", error?.message || error);
  }
};

const connectToDatabase = async (mongodb_url) => {
  if (!mongodb_url) {
    console.warn("MONGODB_URL is not set; skipping database connection.");
    return;
  }
  try {
    await mongoose.connect(mongodb_url);
    console.log("Connected to database successfully");
    await ensureUserIndexes();
  } catch (error) {
    console.log(error);

    console.log("Failed to connect with database");
  }
};

export default connectToDatabase;
