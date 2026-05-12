import fs from "node:fs";
import path from "node:path";

const targetPath = path.join(
  process.cwd(),
  "node_modules",
  "spawn-command",
  "lib",
  "spawn-command.js"
);

if (!fs.existsSync(targetPath)) {
  process.exit(0);
}

const original = fs.readFileSync(targetPath, "utf8");
const updated = original.replace(
  "util._extend({}, options)",
  "Object.assign({}, options)"
);

if (updated !== original) {
  fs.writeFileSync(targetPath, updated, "utf8");
}
