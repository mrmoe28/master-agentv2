# Master Agent OS

<p align="center">
  <img src="master-agent-icon.png" width="96" alt="Master Agent OS icon" />
</p>

Local-first autonomous agent orchestration: a master agent plans and delegates to specialized sub-agents, with parallel execution (BullMQ), long-term memory (LanceDB), and integrations for Gmail, Calendar, Drive, Twilio, and SendGrid.

**Chat assistant:** Web search (Serper API), browser automation, email, desktop tools, and **stored skills**—teach the agent procedures (e.g. "when I say onboarding, do X then Y"); it saves them and follows them when relevant.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (or yarn/pnpm)
- **Redis** (optional) — required only for parallel sub-agent execution via BullMQ
- **Ollama** (optional) — for local LLM instead of OpenAI

---

## Build & run (full setup)

Follow these steps in order so the app, database, and build all work.

### 1. Clone and install dependencies

```bash
git clone https://github.com/mrmoe28/mastersagent.git
cd mastersagent
npm install
```

### 2. Environment configuration

Copy the example env file and fill in your values. **Do not commit `.env`.**

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` with at least:

- **LLM:** `OPENAI_API_KEY` (or use Ollama — see [Environment variables](#environment-variables))
- **Optional:** `APP_DATA_DIR` — absolute path so tokens, memory, and DB persist across restarts (e.g. `D:\MasterAgentData` or `%APPDATA%\MasterAgentOS`)

See the comments in `.env.example` for all options.

### 3. Database setup (required)

The app uses SQLite with Drizzle ORM. Run migrations once to create the database file and all tables.

```bash
npm run db:migrate
```

- **Database file:** Created at `APP_DATA_DIR/sqlite.db` if `APP_DATA_DIR` is set, otherwise `data/sqlite.db` (relative to the project). The `data` directory is created if needed.
- **Tables created:** `projects`, `agents`, `tasks`, `chat_messages`, `history_items`, `log_entries`, `memory_items`, `skills`.

To inspect or edit data: `npm run db:studio` (Drizzle Studio). To add new migrations after changing `src/db/schema.ts`: `npm run db:generate` then `npm run db:migrate`.

### 4. Run the app

**Development (recommended first):**

```bash
npm run dev
```

Open [http://localhost:6001](http://localhost:6001).

**Production build and run:**

```bash
npm run build
npm run start
```

Optional: if you use the BullMQ worker in production, build the backend and run the worker:

```bash
npm run backend:build
npm run backend:worker
```

**CLI agent (optional):**

```bash
npm run agent
```

**BullMQ worker (optional, for parallel sub-agents):**  
Requires Redis. In one terminal run the worker, in another run the app or agent:

```bash
npm run backend:worker:dev
```

---

## Quick reference: full setup order

| Step | Command / action |
|------|-------------------|
| 1 | `git clone https://github.com/mrmoe28/mastersagent.git` then `cd mastersagent` |
| 2 | `npm install` |
| 3 | Copy `.env.example` to `.env` and set at least `OPENAI_API_KEY` (or Ollama) |
| 4 | `npm run db:migrate` (creates SQLite DB and tables) |
| 5 | `npm run dev` (dev server) or `npm run build` then `npm run start` (production) |

---

## Dependencies

Installed via `npm install`. Main categories:

| Category | Packages |
|----------|----------|
| **App & UI** | Next.js 15, React 19, Tailwind CSS, Radix UI, Zustand, Lucide |
| **LLM & AI** | OpenAI SDK, Ollama client, Transformers.js (embeddings) |
| **Data** | Drizzle ORM, better-sqlite3, LanceDB, Apache Arrow |
| **Queue** | BullMQ, ioredis |
| **Integrations** | googleapis, google-auth-library, Twilio, SendGrid |
| **Tools** | Playwright (browser), Zod, pdfjs-dist |

**Dev:** TypeScript, ESLint, Drizzle Kit, tsx, Tailwind/PostCSS.

Full list: see `package.json` in the repo.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | For cloud LLM | OpenAI API key (or use `OPENAI_BASE_URL` for local/compatible API) |
| `APP_DATA_DIR` | No | Absolute path for persistent data (tokens, memory, DB). If unset, uses `./data`. |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | For BullMQ | Redis connection for task queue |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | For Google | OAuth for Gmail, Calendar, Drive |
| `SENDGRID_API_KEY` | For email | SendGrid API key |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | For SMS/voice | Twilio credentials |
| `OLLAMA_HOST` | For local LLM | Default `http://localhost:11434` when not using OpenAI |
| `CHROME_CDP_URL` | For browser tools | e.g. `http://localhost:9222` — start Chrome with `--remote-debugging-port=9222` |
| `GOOGLE_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` | For web search (Google) | Same Cloud project; enable Custom Search API; create engine at [programmablesearchengine.google.com](https://programmablesearchengine.google.com) (100 free queries/day) |
| `SERPER_API_KEY` | For web search (alternative) | Enables `web_search` if Google not set; [serper.dev](https://serper.dev) (2,500 free queries/month) |

Details and more options: `.env.example` and `env.example` in the repo.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 6001) |
| `npm run build` | Production build (Next.js); run before `npm run start` |
| `npm run start` | Start production Next.js server (port 6001) |
| `npm run agent` | Run autonomous agent (CLI) |
| `npm run backend:worker:dev` | Start BullMQ worker (dev) |
| `npm run backend:worker` | Start BullMQ worker (requires `npm run backend:build` first) |
| `npm run backend:build` | Build backend TypeScript to `dist-backend/` |
| `npm run db:migrate` | Run Drizzle migrations (creates/updates SQLite DB and tables) |
| `npm run db:studio` | Open Drizzle Studio to browse/edit DB |
| `npm run db:generate` | Generate new migration files after editing `src/db/schema.ts` |
| `npm run lint` | Run ESLint |

---

## Screenshots

You can add app screenshots or diagrams to the README. Put image files in the `images/` folder and reference them with Markdown:

```markdown
![Description of the image](images/your-screenshot.png)
```

To size an image in HTML (e.g. width 600px):

```markdown
<img src="images/your-screenshot.png" width="600" alt="Description" />
```

Example: after adding `images/dashboard.png`, you could add a section like:

| Dashboard | Chat |
|-----------|------|
| ![Dashboard](images/dashboard.png) | ![Chat](images/chat.png) |

---

## Optional: Redis and Ollama

- **Redis** — Install and run Redis locally (or use a hosted instance). Set `REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD` in `.env`. Required for `backend:worker` and parallel sub-agent runs.
- **Ollama** — Install from [ollama.ai](https://ollama.ai). Set `OLLAMA_HOST` (default `http://localhost:11434`) and optionally `OLLAMA_MODEL`. Use when you don’t set `OPENAI_API_KEY`.

For more on architecture and code layout, see `CLAUDE.md`.
