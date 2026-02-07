/**
 * Example sub-agent: echoes input. Use for testing or as a template.
 */

import type { ISubAgent } from "./types.js";

export const ECHO_AGENT_TYPE = "echo";

export class EchoSubAgent implements ISubAgent {
  readonly type = ECHO_AGENT_TYPE;

  async run(input: unknown): Promise<unknown> {
    return { echoed: input, at: new Date().toISOString() };
  }
}
