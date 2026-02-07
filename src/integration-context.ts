/**
 * Integration context for agent tools. Set by app on startup so send_email, schedule_meeting, etc. can run.
 */

import type { IntegrationService } from "./services/integration-service.js";

export interface IntegrationContext {
  integrationService: IntegrationService;
  userId?: string;
}

let context: IntegrationContext | null = null;

export function setIntegrationContext(ctx: IntegrationContext | null): void {
  context = ctx;
}

export function getIntegrationContext(): IntegrationContext | null {
  return context;
}
