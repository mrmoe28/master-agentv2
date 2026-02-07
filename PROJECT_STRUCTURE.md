# Master Agent OS — Project Folder Structure

```
llm-master-agent/
├── PRD.md
├── PROJECT_STRUCTURE.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle.config.ts
├── .env.example
├── .env.local                 # (gitignored) local env
├── .gitignore
│
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing / redirect
│   ├── globals.css
│   ├── (dashboard)/           # Dashboard route group
│   │   ├── layout.tsx         # Sidebar + main content
│   │   ├── page.tsx           # Default → chat
│   │   ├── chat/
│   │   │   └── page.tsx       # Chat UI
│   │   └── history/
│   │       └── page.tsx       # Conversation history
│   └── api/
│       ├── health/
│       │   └── route.ts       # Health check
│       └── chat/
│           └── route.ts       # Chat API (streaming stub)
│
├── components/
│   ├── ui/                    # Reusable UI (buttons, inputs, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── MessageList.tsx
│   │   └── ChatInput.tsx
│   └── history/
│       └── HistoryList.tsx
│
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client
│   │   └── schema.ts          # Tables (users, conversations, tasks, etc.)
│   ├── ollama/
│   │   └── client.ts          # Ollama / LM Studio client
│   ├── vector/                # Vector store (Chroma) — Phase 3
│   │   └── index.ts
│   └── google/                # Gmail, Calendar, Drive — Phase 4
│       ├── auth.ts
│       ├── gmail.ts
│       ├── calendar.ts
│       └── drive.ts
│
├── server/
│   ├── agents/
│   │   ├── master.ts          # Master agent (planning)
│   │   └── subagents/         # leads, email, calendar, etc.
│   │       ├── index.ts
│   │       ├── leads.ts
│   │       ├── email.ts
│   │       └── ...
│   ├── queue/                 # Task queue — Phase 2
│   │   └── executor.ts
│   └── memory/                # RAG / context — Phase 3
│       └── retrieval.ts
│
├── types/
│   └── index.ts               # Shared types (Task, Message, Plan, etc.)
│
└── scripts/
    └── migrate.ts             # Run Drizzle migrations
```

## Key Directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router: pages, layouts, API routes |
| `app/(dashboard)/` | Chat, history, settings behind sidebar layout |
| `app/api/` | REST endpoints (health, chat, auth, webhooks) |
| `components/` | React components (UI, layout, chat, history) |
| `lib/` | DB client, Ollama client, vector store, Google adapters |
| `server/` | Agent logic, task queue, memory/RAG (server-only) |
| `types/` | Shared TypeScript types |
| `scripts/` | Migrations, seed, dev utilities |
