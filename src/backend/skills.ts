/**
 * Stored skills: named procedures the agent can follow.
 * Stored in SQLite (skills table) and in RAG for semantic retrieval.
 */

import { getDb } from "@/db";
import { skills as skillsTable } from "@/db/schema";
import { addRAGDocument } from "./memory/rag";
import { eq } from "drizzle-orm";

export interface StoredSkill {
  id: string;
  name: string;
  description: string;
  steps: string;
  createdAt: string;
}

/**
 * Create a skill and add it to RAG so it can be retrieved by relevance.
 */
export async function createSkill(
  name: string,
  description: string,
  steps: string
): Promise<StoredSkill> {
  const trimmedName = (name || "").trim();
  const trimmedDesc = (description || "").trim();
  const trimmedSteps = (steps || "").trim();
  if (!trimmedName || !trimmedSteps) {
    throw new Error("Skill name and steps are required.");
  }

  const id = `skill_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const createdAt = new Date().toISOString();

  const db = getDb();
  await db.insert(skillsTable).values({
    id,
    name: trimmedName,
    description: trimmedDesc,
    steps: trimmedSteps,
    createdAt,
  });

  const ragText = `Skill: ${trimmedName}. ${trimmedDesc ? trimmedDesc + ". " : ""}Steps: ${trimmedSteps}`;
  await addRAGDocument(ragText, {
    type: "skill",
    skillId: id,
    name: trimmedName,
    timestamp: createdAt,
  }).catch((err) =>
    console.warn("[skills] Failed to add skill to RAG:", err)
  );

  return {
    id,
    name: trimmedName,
    description: trimmedDesc,
    steps: trimmedSteps,
    createdAt,
  };
}

/**
 * List all stored skills, newest first.
 */
export async function listSkills(): Promise<StoredSkill[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(skillsTable)
    .orderBy(skillsTable.createdAt);
  return rows.reverse();
}

/**
 * Get one skill by id.
 */
export async function getSkillById(id: string): Promise<StoredSkill | null> {
  const db = getDb();
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.id, id)).limit(1);
  return rows[0] ?? null;
}
