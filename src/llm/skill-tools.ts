/**
 * Skill tools: create and list stored procedures the agent can follow.
 * Skills are also stored in RAG and retrieved by relevance in chat.
 */

import type { ChatToolDef } from "./client";
import { createSkill, listSkills } from "@/backend/skills";

export const skillToolDefs: ChatToolDef[] = [
  {
    name: "create_skill",
    description:
      "Save a new skill (a named procedure with steps) so it appears on the Skills page. Store concrete, actionable steps (what to do step-by-step), not the user's prompt or a meta-instruction. Use when: (1) the user teaches you a procedure, or (2) after web_search for a how-to—summarize into clear steps. In your chat reply you MUST show the full skill (name, description, steps) so the user sees what was stored, not just 'I saved it'.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Short name for the skill (e.g. 'onboarding', 'extract data from web page')",
        },
        description: {
          type: "string",
          description: "One sentence describing when to use this skill",
        },
        steps: {
          type: "string",
          description: "The procedure: concrete numbered steps (what to do). Do not put the user prompt or 'create a skill'—put the actual actions, e.g. '1. Navigate to the URL. 2. Use browser_snapshot. 3. Use browser_extract to get name, phone, email.'",
        },
      },
      required: ["name", "steps"],
    },
    execute: async (args) => {
      const name = String(args.name ?? "").trim();
      const description = String(args.description ?? "").trim();
      const steps = String(args.steps ?? "").trim();
      if (!name || !steps) {
        return JSON.stringify({
          success: false,
          error: "name and steps are required.",
        });
      }
      try {
        const skill = await createSkill(name, description, steps);
        return JSON.stringify({
          success: true,
          skill: {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            steps: skill.steps,
          },
          message: "Skill saved. In your reply you MUST show the user the full skill below (name, description, and steps)—do not only say 'I saved it'. Show the actual procedure so they see the skill, not just the prompt.",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
  {
    name: "list_skills",
    description:
      "List all stored skills (name, description, steps). Use when the user asks what skills you have or to show saved procedures. In your reply you MUST show each skill fully: name, description, and steps—so the user sees the procedure, not just the skill names.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      try {
        const all = await listSkills();
        return JSON.stringify({
          success: true,
          count: all.length,
          skills: all.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            steps: s.steps,
            createdAt: s.createdAt,
          })),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  },
];
