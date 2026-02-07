/**
 * Master Agent OS - backend core.
 *
 * 1. Agent Orchestrator: MasterAgent, sub-agent spawning, parallel execution, task queue (BullMQ), retry + failure handling.
 * 2. Memory System: long-term storage on disk (LanceDB), vector embeddings (Transformers.js), RAG retrieval.
 */

export { MasterAgent } from "./orchestrator/MasterAgent";
export {
  registerSubAgent,
  unregisterSubAgent,
  getSubAgentRegistry,
} from "./orchestrator/sub-agents";
export type { ISubAgent, SpawnTaskInput, SpawnResult, SpawnParallelOptions, WaitResult } from "./orchestrator/types";
export { EchoSubAgent } from "./orchestrator/EchoSubAgent";

export { getTaskQueue, enqueueTask, enqueueTasks } from "./queue/task-queue";
export type { TaskPayload, TaskResult } from "./queue/types";
export { DEFAULT_JOB_OPTS, QUEUE_NAME } from "./queue/types";

export { addRAGDocument, addRAGDocuments, ragRetrieve } from "./memory/rag";
export type { RAGDocument, RAGResult } from "./memory/rag";
export { addLearning, getAllLearnings } from "./memory/learnings";
export type { StoredLearning } from "./memory/learnings";
export { addDocument, addDocuments, search, getConnection } from "./memory/store";
export { embedOne, embedBatch, createEmbeddingFunction } from "./memory/embeddings";
export { createSkill, listSkills, getSkillById } from "./skills";
export type { StoredSkill } from "./skills";
