# Master Agent OS — Product Requirements Document

**Version:** 1.0  
**Last Updated:** February 5, 2025  
**Status:** Draft

---

## 1. Problem Statement

Business operators and small teams spend excessive time on repetitive operational tasks: lead follow-up, email triage, calendar coordination, SOP lookup, outreach (text/call), research, and content creation. These tasks are fragmented across tools, lack context continuity, and do not improve from past executions. There is no single system that runs **locally** (data sovereignty, no vendor lock-in), uses a **local LLM** (Ollama/LM Studio), and orchestrates **hundreds of parallel sub-agents** with **long-term memory** and **autonomous planning**.

**Master Agent OS** solves this by providing a production-ready SaaS-style application that:

- Runs entirely on the user’s infrastructure with a local LLM (Ollama or LM Studio).
- Uses a local database and vector store for persistence and RAG.
- Orchestrates many sub-agents in parallel for leads, email, calendar, SOPs, texting, calling, research, and writing.
- Maintains long-term contextual memory and learns from every task.
- Connects to Gmail, Google Calendar, and Google Drive.
- Operates with full autonomy to plan and execute workflows.
- Exposes a modern web UI (chat, sidebar, history).

---

## 2. User Personas

| Persona | Role | Goals | Pain Points |
|--------|------|--------|-------------|
| **Ops Lead** | Operations / COO | Automate SOPs, ensure consistency, scale without headcount | Manual handoffs, context loss, no audit trail |
| **Sales Lead** | Sales / RevOps | Automate lead nurture, follow-ups, CRM sync | Tool sprawl, missed follow-ups, no unified view |
| **Executive Assistant** | EA / Ops | Manage calendar, email, research, drafting | Context switching, no memory across tools |
| **Solo Founder** | Founder | One-person ops: leads, email, content, research | Time sink on repetitive work, no learning system |

---

## 3. Core Features

### 3.1 Agent Orchestration

- **Master agent** that decomposes user intents into tasks and assigns them to specialized sub-agents.
- **Sub-agent types:** Leads, Email, Calendar, SOPs, Texting, Calling, Research, Writing.
- **Parallel execution:** Ability to spawn and control hundreds of sub-agents concurrently (with configurable concurrency and backpressure).
- **Task queue:** Durable queue (e.g., in DB or Redis) for planned tasks; retries and dead-letter handling.

### 3.2 Integrations

- **Gmail:** Read/send/search, labels, threads; OAuth2.
- **Google Calendar:** List/create/update/delete events; OAuth2.
- **Google Drive:** List/search/read/create files; OAuth2.
- **Ollama / LM Studio:** Local LLM for chat, tool use, and planning (configurable endpoint and model).

### 3.3 Memory & Learning

- **Long-term contextual memory (RAG):** Vector store (e.g., Chroma) for documents, conversations, and task outcomes; semantic retrieval for context in every run.
- **Learning from tasks:** Store task inputs, outputs, and feedback; use for few-shot examples, fine-tuning data export, or prompt augmentation.

### 3.4 Autonomy & Workflows

- **Autonomous planning:** Master agent produces structured plans (steps, dependencies, assignments).
- **Workflow execution:** Execute plans with dependency ordering and parallelization where safe.
- **Human-in-the-loop:** Optional approval gates and escalation for sensitive actions (e.g., sending email, calendar changes).

### 3.5 Web UI

- **Chat:** Primary interface for natural-language commands and follow-up.
- **Sidebar:** Navigation (chat, history, agents, integrations, settings).
- **History:** Conversation and task history with search and filters.
- **Settings:** LLM config, Google OAuth, concurrency, feature toggles.

---

## 4. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | Sub-agent spawn & first token &lt; 2s under normal load; support 100+ concurrent sub-agents with backpressure. |
| **Availability** | No hard dependency on external SaaS beyond Google APIs; local LLM and DB. |
| **Security** | All secrets in env vars or secret manager; OAuth tokens encrypted at rest; no PII in logs. |
| **Observability** | Structured logs, task lifecycle events, optional metrics (e.g., Prometheus). |
| **Data residency** | All app data (DB, vector store) and LLM inference local; only Google API calls leave the network. |
| **Scalability** | Horizontal scaling of API/workers possible with external queue (e.g., Redis) in later phases. |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Web Browser                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Chat UI   │  │   Sidebar   │  │   History   │  │ Settings / Integr.  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                    │ HTTPS / WebSocket (optional)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 Application                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  App Router: /app, /api, Server Actions, RSC                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Agent Router   │  │  Task Queue     │  │  Integration Adapters       │  │
│  │  (Master +      │  │  (Planner →     │  │  Gmail, Calendar, Drive     │  │
│  │   Sub-agents)   │  │   Executor)     │  │  (OAuth2, googleapis)        │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                           │                 │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌──────────────┴──────────────┐  │
│  │  Memory / RAG   │  │  LLM Client     │  │  Vector Store Client         │  │
│  │  (Context       │  │  (Ollama /      │  │  (Chroma or equivalent)      │  │
│  │   retrieval)    │  │   LM Studio)    │  │                              │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
└───────────┼────────────────────┼───────────────────────────┼─────────────────┘
            │                    │                           │
            ▼                    ▼                           ▼
┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────────────┐
│  SQLite (Drizzle) │  │  Ollama /         │  │  Chroma (local or server)    │
│  • Users, sessions │  │  LM Studio        │  │  • Embeddings, RAG docs      │
│  • Tasks, runs     │  │  (local LLM)      │  │  • Conversation memory      │
│  • OAuth tokens    │  │                   │  │  • SOPs, learnings           │
│  • Audit log       │  │                   │  │                              │
└───────────────────┘  └───────────────────┘  └─────────────────────────────┘
```

- **Frontend:** Next.js 15 App Router, React Server Components, client components for chat/sidebar/history.
- **Backend:** Next.js API routes + Server Actions; agent runtime and task queue run in Node.
- **Orchestration:** Single master agent process that plans and dispatches to sub-agent workers (in-process or queue-based); parallel execution with a bounded pool.

---

## 6. Database Schema

**ORM:** Drizzle. **Database:** SQLite (default; can swap to PostgreSQL for multi-node).

| Table | Purpose |
|-------|---------|
| **users** | id, email, name, created_at, updated_at |
| **sessions** | id, user_id, token_hash, expires_at |
| **oauth_credentials** | id, user_id, provider (google), access_token_enc, refresh_token_enc, expires_at |
| **conversations** | id, user_id, title, created_at, updated_at |
| **messages** | id, conversation_id, role (user|assistant|system), content, metadata (JSON), created_at |
| **tasks** | id, conversation_id, type (plan|execute), payload (JSON), status (pending|running|done|failed), result (JSON), created_at, updated_at |
| **agent_runs** | id, task_id, agent_type (master|leads|email|...), model, input_tokens, output_tokens, latency_ms, created_at |
| **memory_entries** | id, user_id, source (conversation|task|upload), content_hash, embedding_id (ref to vector store), metadata (JSON), created_at |
| **audit_log** | id, user_id, action, resource_type, resource_id, details (JSON), created_at |

Vector store (Chroma) holds:

- **Collections:** `conversations`, `documents`, `sops`, `learnings` (or equivalent). Each document has metadata (user_id, source, timestamp) for filtering.

---

## 7. Agent Orchestration Model

- **Master agent (single per “run”):**
  - Input: User message + retrieved context (RAG from conversation + docs + SOPs).
  - Output: Structured plan (list of steps; each step: sub-agent type, input payload, dependencies).
  - Uses local LLM (Ollama/LM Studio) with a tools interface for “create_plan” and “delegate”.

- **Sub-agents (many in parallel):**
  - Types: `leads`, `email`, `calendar`, `sops`, `texting`, `calling`, `research`, `writing`.
  - Each has a dedicated tool set (e.g., Gmail, Calendar, Drive, internal DB).
  - Invoked by the executor based on the master’s plan; run in a worker pool with concurrency limit (e.g., 50–200).
  - Results are written back to the task store and optionally fed back to RAG (learnings).

- **Execution flow:**
  1. User message → Master agent + RAG context.
  2. Master outputs plan → Task queue (DB or Redis).
  3. Executor resolves dependencies, schedules runnable steps.
  4. Sub-agents run in parallel where dependencies allow; results aggregated.
  5. Optional: Master summarizes and updates conversation; memory layer stores outcome for future RAG.

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, UI components (e.g. shadcn/ui) |
| **Backend** | Next.js API Routes, Server Actions, Node 20+ |
| **Database** | SQLite (better-sqlite3), Drizzle ORM |
| **Vector store** | Chroma (local or Chroma server) |
| **LLM** | Ollama (default) or LM Studio; `ollama` npm client; configurable base URL and model |
| **Google** | googleapis (Gmail, Calendar, Drive), OAuth2 |
| **Auth** | Session-based (cookie); OAuth2 for Google only (no mandatory auth in Phase 1) |
| **Real-time (optional)** | Server-Sent Events or WebSocket for chat streaming and task progress |

---

## 9. Security

- **Secrets:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY` in env; never in repo.
- **OAuth tokens:** Encrypt at rest (e.g., AES-256-GCM) using `ENCRYPTION_KEY`; store in `oauth_credentials`.
- **API routes:** Auth middleware validates session; rate limiting on chat and task creation.
- **Data:** No PII in application logs; audit_log for sensitive actions (send email, delete event, etc.).
- **Network:** LLM and DB are local; only Google API calls go to the internet; optional allowlist for Ollama/LM Studio URL.

---

## 10. Roadmap Phases

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0 – Scaffold** | PRD, repo structure, Next.js 15 app, DB schema, one health API, UI shell (chat + sidebar + history placeholders) | Runnable app; zero build/lint errors |
| **P1 – Core agent** | Ollama/LM Studio client, master agent (plan only), in-memory task list, chat UI with streaming | User can chat; agent returns a plan (no execution) |
| **P2 – Sub-agents & queue** | Sub-agent stubs, task queue (DB), executor with parallel pool, minimal tools (e.g., echo) | End-to-end plan → execute with stub tools |
| **P3 – Memory & RAG** | Chroma, embeddings, RAG pipeline, store conversation and task summaries | Context-aware responses and learning from tasks |
| **P4 – Google** | Gmail, Calendar, Drive adapters; OAuth flow; real tools for email/calendar/writing | Production-ready integrations |
| **P5 – Autonomy & UI** | Approval gates, history search, settings, polish | Full autonomy with guardrails; shippable product |

---

*This PRD defines the scope for the Master Agent OS scaffold (P0) and subsequent phases.*
