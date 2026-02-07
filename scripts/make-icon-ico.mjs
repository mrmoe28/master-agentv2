// Creates master-agent-icon.ico from master-agent-icon.png (run: node scripts/make-icon-ico.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pngPath = path.join(root, "master-agent-icon.png");
const icoPath = path.join(root, "master-agent-icon.ico");

if (!fs.existsSync(pngPath)) {
  console.error("Missing master-agent-icon.png in project root");
  process.exit(1);
}

const pngToIco = (await import("png-to-ico")).default;
const buf = await pngToIco(pngPath);
fs.writeFileSync(icoPath, buf);
console.log("Written:", icoPath);
