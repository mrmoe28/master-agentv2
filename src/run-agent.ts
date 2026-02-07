/**
 * CLI entry point for the autonomous planning agent.
 * Run: npm run agent [goal]
 * Example: npm run agent "Organize all leads, email them, schedule followups"
 */

import { getErrorMessage } from "@/utils/errors";

const goalFromArg =
  process.argv.slice(2).join(" ").trim() ||
  "Organize all leads, email them, schedule followups";

let isShuttingDown = false;

/**
 * Cleanup function to gracefully close connections
 */
async function cleanup(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n[Agent] Cleaning up...");

  try {
    // Close queue connections if they were initialized
    const { closeQueue } = await import("./backend/queue/task-queue.js");
    await closeQueue();
    console.log("[Agent] Queue connections closed");
  } catch {
    // Queue module may not have been loaded
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[Agent] Received ${signal}, shutting down gracefully...`);
  await cleanup();
  process.exit(0);
}

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", async (err) => {
  console.error("[Agent] Uncaught exception:", getErrorMessage(err));
  await cleanup();
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  console.error("[Agent] Unhandled rejection:", getErrorMessage(reason));
  await cleanup();
  process.exit(1);
});

async function main() {
  console.log("Goal:", goalFromArg);
  console.log("Starting autonomous agent (planner → executor → evaluator)...");

  // Set integration context when env is configured so send_email, schedule_meeting, send_sms, call_customer, upload_file work.
  const { getEnv } = await import("./lib/env.js");
  const hasIntegration =
    getEnv("SENDGRID_API_KEY") ||
    (getEnv("TWILIO_ACCOUNT_SID") && getEnv("TWILIO_AUTH_TOKEN")) ||
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (hasIntegration) {
    try {
      const { IntegrationService } = await import("./services/integration-service.js");
      const { setIntegrationContext } = await import("./integration-context.js");
      setIntegrationContext({
        integrationService: new IntegrationService(),
        userId: process.env.GOOGLE_USER_ID ?? undefined,
      });
    } catch (err) {
      console.warn("[Agent] Failed to initialize integrations:", getErrorMessage(err));
    }
  }

  const { runAutonomousAgent } = await import("./agent.js");
  const result = await runAutonomousAgent(goalFromArg);

  console.log("\n--- Result ---");
  console.log("Success:", result.success);
  console.log("Iterations:", result.iterations);
  if (result.evaluation) {
    console.log("Score:", result.evaluation.score);
    console.log("Reasoning:", result.evaluation.reasoning);
  }
  if (result.errors && result.errors.length > 0) {
    console.log("\nErrors encountered:");
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }
  if (result.finalReport) {
    console.log("\nFinal report:\n", result.finalReport);
  }
  console.log("\nTask results:");
  for (const r of result.taskResults) {
    console.log(
      `  ${r.taskId}: ${r.success ? "OK" : "FAIL"} - ${r.output.slice(0, 60)}...`
    );
  }

  // Clean up before normal exit
  await cleanup();
}

main().catch(async (err) => {
  console.error("[Agent] Fatal error:", getErrorMessage(err));
  await cleanup();
  process.exit(1);
});
