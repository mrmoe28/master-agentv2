import { getDb } from "../src/db";
import { skills } from "../src/db/schema";

async function main() {
  const db = getDb();
  await db.delete(skills);
  console.log("Skills table cleared.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
