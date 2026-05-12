import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from "dotenv";

import app from "./app.js";
import connectDB from "./src/config/db.js";

dotenv.config({ quiet: true });

const PORT = process.env.PORT || 4008;

const startServer = async () => {
  const dbStatus = await connectDB();
  app.locals.db = dbStatus;

  app.listen(PORT, () => {
    console.log(`TMS Backend running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    if (!dbStatus.connected) {
      console.warn("TMS Backend started without MongoDB. Fix MONGO_URI before using data modules.");
    }
  });
};

startServer().catch((error) => {
  console.error("Failed to start TMS Backend:", error.message);
  process.exit(1);
});
