# Master Agent OS – Backend Core

Backend-only implementation: **Agent Orchestrator** (BullMQ task queue, master agent, sub-agents, parallel execution, retry/failure handling) and **Memory System** (LanceDB on disk, vector embeddings, RAG retrieval).

## Requirements

- **Node.js** 18+
- **Redis** (for BullMQ). Default: `localhost:6379`.

## Setup

```bash
# From repo root
npm install
npm run backend:build
```

Optional env (create `.env` or set in shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | - | Redis password |
| `WORKER_CONCURRENCY` | `5` | BullMQ worker parallel jobs |
| `APP_DATA_DIR` | (none) | App data root; if set, LanceDB uses `APP_DATA_DIR/lancedb`. Enables persistent memory across restarts. |
| `LANCEDB_PATH` | `APP_DATA_DIR/lancedb` or `./data/lancedb` | LanceDB storage directory (override) |

## 1. Agent Orchestrator

- **MasterAgent** – Spawns sub-agent tasks via the task queue (`spawn`, `spawnParallel`), waits for results (`waitForJob`, `waitForJobs`).
- **Task queue (BullMQ)** – `getTaskQueue()`, `enqueueTask()`, `enqueueTasks()` with retry (3 attempts, exponential backoff) and failure handling.
- **Sub-agents** – Register handlers with `registerSubAgent(agent)`. Processor runs `agent.run(input)` by `agentType`.
- **Worker** – Run `npm run backend:worker:dev` (or `backend:worker` after build). Processes jobs with concurrency; failed jobs are logged and retried per queue options.

Example:

```ts
import { MasterAgent, registerSubAgent } from "@/backend";
import { MySubAgent } from "./MySubAgent";

registerSubAgent(new MySubAgent());

const master = new MasterAgent();
const { taskId, jobId } = await master.spawn({
  agentType: "my-agent",
  input: { query: "hello" },
});
const result = await master.waitForJob(jobId);
```

## 2. Memory System

- **Long-term storage** – LanceDB persisted under `LANCEDB_PATH`.
- **Vector embeddings** – Local model `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers` (no API key).
- **RAG** – `addRAGDocument` / `addRAGDocuments`, `ragRetrieve(query, { limit })` for similarity search.
- **Note:** Metadata is stored as JSON strings to avoid Arrow schema issues. If you see RAG add errors after an upgrade, delete the LanceDB directory (`LANCEDB_PATH` or `data/lancedb`) so the table is recreated.

Example:

```ts
import { addRAGDocument, ragRetrieve } from "@/backend";

await addRAGDocument("Some fact or note.", { source: "user" });
const hits = await ragRetrieve("relevant query", { limit: 5 });
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run backend:build` | Compile backend to `dist-backend/` |
| `npm run backend:worker` | Run BullMQ worker (after build) |
| `npm run backend:worker:dev` | Run worker with tsx watch |

## Exports (`src/backend/index.ts`)

- **Orchestrator:** `MasterAgent`, `registerSubAgent`, `unregisterSubAgent`, `getSubAgentRegistry`, `EchoSubAgent`, types (`ISubAgent`, `SpawnTaskInput`, etc.).
- **Queue:** `getTaskQueue`, `enqueueTask`, `enqueueTasks`, `TaskPayload`, `TaskResult`, `DEFAULT_JOB_OPTS`, `QUEUE_NAME`.
- **Memory:** `addRAGDocument`, `addRAGDocuments`, `ragRetrieve`, `addDocument`, `addDocuments`, `search`, `getConnection`, `embedOne`, `embedBatch`, `createEmbeddingFunction`, `RAGDocument`, `RAGResult`.
