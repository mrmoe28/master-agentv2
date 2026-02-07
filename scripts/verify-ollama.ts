/**
 * Verify Ollama connection. Exit 0 if OK, 1 if connection failed.
 * Usage: npm run verify:ollama
 */

import { verifyOllamaConnection } from "../src/llm/ollama";

async function main() {
  process.stdout.write("Checking Ollama connection... ");
  const result = await verifyOllamaConnection();
  if (result.ok) {
    console.log("OK");
    console.log("Host:", result.host);
    if (result.models?.length) {
      console.log("Models:", result.models.map((m) => m.name).join(", "));
    } else {
      console.log("Models: (none listed)");
    }
    process.exit(0);
  } else {
    console.log("FAILED");
    console.error("Error:", result.error);
    process.exit(1);
  }
}

main();
