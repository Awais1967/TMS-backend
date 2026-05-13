import dns from "node:dns";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const servers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (servers.length) {
  dns.setServers(servers);
}
