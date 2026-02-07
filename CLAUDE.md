# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Master Agent OS is a local-first autonomous agent orchestration system. It uses a master agent to plan and delegate tasks to specialized sub-agents, with parallel execution via BullMQ, long-term memory via LanceDB (vector store), and integrations with Google APIs (Gmail, Calendar, Drive), Twilio, and SendGrid.

## Commands

- `npm run dev` - Start Next.js development server
- `npm run build` - Build the application
- `npm run lint` - Run ESLint
- `npm run agent` - Run the autonomous agent (tsx src/run-agent.ts)
- `npm run backend:worker:dev` - Start BullMQ worker in dev mode
- `npm run backend:worker` - Start BullMQ worker (requires build)
- `npm run backend:build` - Build backend TypeScript
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run mcp:test` - Verify Desktop Commander MCP config and that the server can start

## MCP (Cursor)

Desktop Commander MCP is configured in `.cursor/mcp.json` so Cursor can run terminal commands, manage files, and edit code via the agent. Run `npm run mcp:test` to verify. Reload Cursor or restart MCP in settings to use it.

## Architecture

### Two Type Systems
- `src/agent-types.ts` - Types for agent logic (Goal, Plan, Task for planning, AgentMemory, EvaluationResult, ToolDef)
- `src/types/index.ts` - Types for UI (Project, Agent, Task for UI state, ChatMessage, LogEntry, MemoryItem)

### Core Agent Loop (src/)
- `agent.ts` - Main autonomous agent loop (plan-execute-evaluate cycle)
- `planner.ts` - LLM-based plan generation
- `executor.ts` - Task execution with tool calls
- `evaluator.ts` - Result evaluation and retry decisions
- `memory.ts` - Agent working memory during a run

### Backend (src/backend/)
- `queue/` - BullMQ task queue for parallel sub-agent execution
- `orchestrator/` - MasterAgent class for spawning/waiting on sub-agents
- `memory/` - Long-term memory: embeddings (Transformers.js) + store (LanceDB)

### Integrations (src/integrations/)
- `google/` - Gmail, Calendar, Drive with OAuth2
- `twilio/` - SMS and voice calls
- `sendgrid/` - Email sending
- `token-store.ts` - Encrypted OAuth token storage

### Tools (src/tools/)
- `registry.ts` - Tool registry (parse_leads, send_email, schedule_meeting, etc.)
- Individual tool implementations (leads.ts, email.ts, calendar.ts, crm.ts)

### Frontend (src/app/, src/components/, src/stores/)
- Next.js 15 App Router with React 19
- Zustand stores for state management
- shadcn/ui components

## Environment Variables

Required for full functionality:
- `OPENAI_API_KEY` - OpenAI API key (or set `OPENAI_BASE_URL` for local LLM)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - For BullMQ task queue
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `SENDGRID_API_KEY` - SendGrid email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - Twilio

**Persistent storage (integrations, memory, conversations):** Set `APP_DATA_DIR` to an absolute path (e.g. `D:\MasterAgentData` or `%APPDATA%\MasterAgentOS`) so OAuth tokens, API keys stored in the app, and LanceDB memory persist across restarts and regardless of where you start the app. If unset, data is stored under `./data` (relative to process cwd). Optional overrides: `OAUTH_TOKENS_FILE`, `LANCEDB_PATH`.

**Browser automation (extract from pages you already have open):** Set `CHROME_CDP_URL=http://localhost:9222` and start Chrome with `--remote-debugging-port=9222` so the agent's browser_* tools attach to your existing Chrome and can extract from already-open, logged-in tabs. Optional: `BROWSER_CHANNEL=chrome`, `BROWSER_HEADED=true`.

## Tech Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Drizzle ORM with SQLite (better-sqlite3)
- BullMQ + Redis for task queue
- LanceDB for vector store, Transformers.js for embeddings
- OpenAI SDK (works with Ollama/LM Studio via base URL)
