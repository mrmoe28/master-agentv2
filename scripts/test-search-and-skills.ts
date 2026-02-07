/**
 * Quick test for web_search and skills (create_skill, list_skills).
 * Run: npx tsx scripts/test-search-and-skills.ts
 */

import { webSearch } from "../src/llm/search-tools";
import { createSkill, listSkills } from "../src/backend/skills";

async function main() {
  console.log("=== 1. Web search (expect success with SERPER_API_KEY, else config message) ===\n");
  const searchResult = await webSearch("Node.js current LTS version", 3);
  console.log(JSON.stringify(searchResult, null, 2));
  if (searchResult.success && searchResult.results?.length) {
    console.log("\n✓ Web search returned", searchResult.results.length, "results");
  } else if (!searchResult.success && searchResult.error?.includes("SERPER_API_KEY")) {
    console.log("\n✓ Web search correctly reports missing API key");
  } else {
    console.log("\n? Search result:", searchResult.success ? "ok" : searchResult.error);
  }

  console.log("\n=== 2. Create skill ===\n");
  const skill = await createSkill(
    "test-onboarding",
    "Test procedure for verification",
    "1. Greet the user\n2. Send welcome email\n3. Log completion"
  );
  console.log("Created:", skill.name, "(id:", skill.id + ")");

  console.log("\n=== 3. List skills ===\n");
  const all = await listSkills();
  console.log("Skills count:", all.length);
  all.forEach((s) => console.log(" -", s.name, "|", s.steps.slice(0, 50) + "..."));

  console.log("\n=== All tests completed ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
