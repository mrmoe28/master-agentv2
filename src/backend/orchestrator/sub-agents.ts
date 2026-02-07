/**
 * Sub-agent registry: register handlers by agentType for the queue processor.
 */

import type { ISubAgent } from "./types.js";

const registry = new Map<string, ISubAgent>();

export function getSubAgentRegistry(): Map<string, ISubAgent> {
  return registry;
}

export function registerSubAgent(agent: ISubAgent): void {
  registry.set(agent.type, agent);
}

export function unregisterSubAgent(agentType: string): boolean {
  return registry.delete(agentType);
}
