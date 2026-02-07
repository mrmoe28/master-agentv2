/**
 * Seed the skills table with useful agent skills (coding + automation).
 * Run from project root: npx tsx scripts/seed-skills.ts
 * Uses same DB and RAG as the app (createSkill).
 */

import { createSkill } from "../src/backend/skills";

const SKILLS: { name: string; description: string; steps: string }[] = [
  {
    name: "Code review",
    description: "Review pull requests and code changes for quality, security, and best practices.",
    steps: `1. Read the diff or changed files. 2. Check for correctness and edge cases. 3. Look for security issues (injection, secrets, auth). 4. Suggest clearer names and structure. 5. Note missing tests or docs. 6. Summarize findings and list actionable suggestions.`,
  },
  {
    name: "Code refactoring",
    description: "Safely improve code structure and readability without changing behavior.",
    steps: `1. Identify the target file or function. 2. Run existing tests to establish baseline. 3. Extract duplicated logic into shared functions. 4. Rename for clarity and simplify conditionals. 5. Preserve public API and behavior. 6. Re-run tests and fix any regressions.`,
  },
  {
    name: "Backend API development",
    description: "Add or extend REST/API endpoints and server logic.",
    steps: `1. Confirm route, method, and request/response shape. 2. Add or update the handler and validation (e.g. Zod). 3. Implement business logic and data access (DB or services). 4. Return correct status codes and error payloads. 5. Add or update tests and update API docs if present.`,
  },
  {
    name: "Write unit tests",
    description: "Add unit tests for existing code or new behavior.",
    steps: `1. Locate the module or function to test. 2. Choose test runner (e.g. Jest, Vitest) and match project setup. 3. Write cases for happy path, edge cases, and errors. 4. Mock external deps (API, DB) where needed. 5. Run the test suite and ensure all pass.`,
  },
  {
    name: "Debug failing code",
    description: "Find and fix the root cause of a bug or failing test.",
    steps: `1. Reproduce the failure (run test or steps). 2. Narrow down the failing layer (test, handler, service, DB). 3. Inspect logs, stack traces, and relevant code paths. 4. Form a hypothesis and add a minimal fix or assertion. 5. Re-run until the failure is resolved. 6. Add or adjust a test to prevent regression.`,
  },
  {
    name: "Database schema change",
    description: "Safely add or change tables and migrations.",
    steps: `1. Define the new or changed schema in the project's migration/schema format. 2. Generate a migration file (e.g. drizzle-kit generate). 3. Review the generated SQL for correctness and rollback. 4. Run migrations in dev and run tests. 5. Document any manual steps for data backfill if needed.`,
  },
  {
    name: "Changelog from git",
    description: "Generate a changelog from git history or commits.",
    steps: `1. Determine range (e.g. since last tag or branch). 2. Run git log (and optionally git shortlog) for that range. 3. Group commits by type (feat, fix, chore, etc.) or scope. 4. Format as a changelog (markdown list or standard format). 5. Write to CHANGELOG.md or output for the user.`,
  },
  {
    name: "Document code",
    description: "Add or generate documentation for code (README, JSDoc, API docs).",
    steps: `1. Identify the module, API, or repo to document. 2. Add JSDoc/TSDoc for public functions and types. 3. Update or create README with setup, usage, and examples. 4. If the project has API docs (OpenAPI, etc.), update them. 5. Keep docs close to the code and in sync with behavior.`,
  },
  {
    name: "Frontend component",
    description: "Create or update a UI component with styling and accessibility.",
    steps: `1. Confirm component API (props, slots, events). 2. Implement markup and layout (e.g. React/Vue). 3. Apply styles (Tailwind/CSS) and match design system. 4. Add keyboard and screen-reader support where needed. 5. Add a simple usage example or story if applicable.`,
  },
  {
    name: "Git branch and PR workflow",
    description: "Create a branch and open a pull request with a clear description.",
    steps: `1. Create a new branch from the correct base (e.g. main). 2. Make and commit changes with clear commit messages. 3. Push the branch and open a PR. 4. Fill in title, description, and link any issues. 5. Request review and run CI; address feedback.`,
  },
  {
    name: "Environment and config",
    description: "Set up or fix environment variables and config for an app.",
    steps: `1. List required env vars from docs or code (e.g. .env.example). 2. Create or update .env with placeholders or safe defaults. 3. Ensure secrets are not committed; use .gitignore for .env. 4. Document any new vars in README or .env.example. 5. Verify app starts and connects to services.`,
  },
  {
    name: "Dependency update",
    description: "Update a dependency and fix breaking changes.",
    steps: `1. Identify the package and target version (e.g. npm outdated). 2. Update in package.json and run install. 3. Run tests and build; fix type and runtime errors. 4. Check changelog for breaking changes and migration notes. 5. Re-run full test suite and smoke-test the app.`,
  },
  {
    name: "Extract data from web page",
    description: "Get structured data from a live or static web page.",
    steps: `1. Navigate to the URL or load the HTML. 2. Use browser_snapshot or parse HTML to inspect structure. 3. Use browser_extract or selectors to get target fields (e.g. name, email, phone). 4. Return data as JSON or structured object. 5. Handle pagination or multiple pages if required.`,
  },
  {
    name: "Send email (transactional)",
    description: "Send a transactional email via the configured provider (e.g. SendGrid).",
    steps: `1. Confirm recipient, subject, and body (plain or HTML). 2. Use the project's email tool or integration (e.g. send_email). 3. Include required headers and avoid spam triggers. 4. Log or return send result and handle failures.`,
  },
  {
    name: "Schedule a meeting",
    description: "Create a calendar event or meeting invite.",
    steps: `1. Collect title, start/end time, attendees, and optional location/link. 2. Use the calendar integration (e.g. Google Calendar) or schedule_meeting tool. 3. Create the event and capture ID or link. 4. Return confirmation and link to the user.`,
  },
  {
    name: "File and folder organization",
    description: "Organize files or find duplicates in a directory.",
    steps: `1. List files in the target directory (and subdirs if needed). 2. Group by extension, name pattern, or size. 3. Identify duplicates (hash or name+size). 4. Propose or apply moves/renames (e.g. by date or category). 5. Report summary and any errors.`,
  },
  {
    name: "PDF extract or merge",
    description: "Extract text from PDFs or merge/split PDF files.",
    steps: `1. Locate the PDF path(s) or URL(s). 2. For extract: use pdf extraction (e.g. pdfjs-dist or project tool) and return text. 3. For merge: combine pages in order and write one PDF. 4. For split: extract pages by range and save as separate files. 5. Return paths or extracted content to the user.`,
  },
  {
    name: "CLI or script automation",
    description: "Automate a repetitive task with a script or CLI.",
    steps: `1. Define inputs (args, env, or config file). 2. Implement steps in a script (Node, Python, or shell). 3. Add error handling and clear usage/help. 4. Run in a dry-run or test env first. 5. Document how to run and any prerequisites.`,
  },
  {
    name: "Ask clarifying questions",
    description: "When a request is vague, ask focused questions before implementing.",
    steps: `1. Identify what is underspecified (scope, format, environment, or constraints). 2. Ask 1–3 short, concrete questions. 3. Do not assume answers; wait for user input. 4. Once clarified, summarize and proceed with the task.`,
  },
  {
    name: "Browser automation (Playwright)",
    description: "Automate browser actions for testing or scraping with Playwright.",
    steps: `1. Launch or attach to browser (e.g. headed or headless). 2. Navigate to the URL. 3. Use selectors to click, type, and wait for elements. 4. Capture snapshots or data as needed. 5. Close browser and return results or screenshots.`,
  },
  {
    name: "REST API integration",
    description: "Integrate with an external REST API (auth, request, parse).",
    steps: `1. Confirm endpoint, method, and auth (API key, OAuth, etc.). 2. Add or use a client (fetch or SDK) and handle rate limits. 3. Map request/response to your types; handle errors and retries. 4. Write a small test or example call. 5. Document the integration and env vars.`,
  },
  {
    name: "Error handling and logging",
    description: "Add consistent error handling and logging in an app.",
    steps: `1. Identify entry points (routes, workers, CLI). 2. Add try/catch and central error handler where appropriate. 3. Log with level, message, and context (no secrets). 4. Return user-friendly messages and correct HTTP status. 5. Ensure stack traces or details only in dev/logs.`,
  },
  {
    name: "Deploy checklist",
    description: "Run through a pre-deploy checklist for a web app or service.",
    steps: `1. Run full test suite and fix failures. 2. Run build and fix build errors. 3. Confirm env vars and secrets for target env. 4. Check DB migrations are applied. 5. Review recent changes and rollback plan. 6. Deploy and smoke-test critical paths.`,
  },
  {
    name: "Parse and normalize leads",
    description: "Parse lead data (CSV, paste, or form) into a normalized structure.",
    steps: `1. Get raw input (file, string, or URL). 2. Parse into rows (CSV/JSON). 3. Map columns to fields (name, email, phone, company). 4. Normalize (trim, format phone, validate email). 5. Deduplicate by email or key. 6. Return list or save via CRM/lead tool if available.`,
  },
  {
    name: "Status update or internal comms",
    description: "Draft a short status update or internal message for the team.",
    steps: `1. Gather what was done, what's next, and any blockers. 2. Write 2–4 short bullets in a standard format. 3. Mention key metrics or dates if relevant. 4. Keep tone professional and scannable. 5. Post or hand off to the requested channel (Slack, email, etc.).`,
  },
  // --- Platform: Next.js ---
  {
    name: "Next.js App Router file conventions",
    description: "Create or refactor Next.js App Router routes and special files correctly.",
    steps: `1. Use app/ for routes: page.tsx = UI, layout.tsx = shared UI, loading.tsx = Suspense, error.tsx = error boundary, not-found.tsx = 404. 2. Dynamic routes: [slug]/ for one segment, [...slug] catch-all, [[...slug]] optional. 3. Route groups: (groupName)/ for organization without URL change. 4. API routes: route.ts in the segment; no page.tsx in same folder for GET. 5. Private folders: prefix with _ (e.g. _components/) to exclude from routing. 6. Use PascalCase for components; co-locate by feature.`,
  },
  {
    name: "Next.js data fetching patterns",
    description: "Choose and implement the right data pattern in Next.js (Server Components, Actions, Route Handlers).",
    steps: `1. Server Component read: fetch or DB directly in async component; no API layer. 2. Mutation from form/UI: use Server Action ('use server', revalidatePath/revalidateTag). 3. External API or webhooks: use Route Handler (route.ts, GET/POST). 4. Avoid waterfalls: use Promise.all for parallel fetches or Suspense for streaming. 5. Client needs data: prefer passing from Server Component as props; else fetch in useEffect or Route Handler. 6. Never use Server Action for cacheable GET; use Route Handler if you need HTTP caching.`,
  },
  {
    name: "Next.js Server Components and RSC boundaries",
    description: "Write valid React Server Components and avoid RSC boundary mistakes.",
    steps: `1. Default: components are Server Components (async OK, no 'use client'). 2. Add 'use client' only for interactivity: useState, useEffect, event handlers, browser APIs. 3. Never make a Client Component async. 4. Pass only serializable props to Client Components (no functions, class instances, or Symbol). 5. Server Actions: define in file with 'use server'; call from Client or Server. 6. Use next/image for images, next/font for fonts; configure remote images in next.config.`,
  },
  {
    name: "Next.js Route Handlers and API routes",
    description: "Implement API routes and Route Handlers in the App Router.",
    steps: `1. Create route.ts in app/api/[segment]/ (e.g. app/api/posts/route.ts). 2. Export GET, POST, PUT, PATCH, DELETE async functions receiving NextRequest. 3. Parse body with request.json() for POST; use request.nextUrl.searchParams for query. 4. Return NextResponse.json(data, { status }) and set headers for cache/CORS. 5. Do not put page.tsx in the same segment as route.ts for GET. 6. Use for external clients, webhooks, or cacheable GET; use Server Actions for internal mutations.`,
  },
  {
    name: "Next.js metadata and OG images",
    description: "Add metadata and Open Graph images for SEO and sharing.",
    steps: `1. Static metadata: export const metadata = { title, description, openGraph } in layout or page. 2. Dynamic: export async function generateMetadata({ params }) { return { title, ... }; }. 3. OG image: use next/og ImageResponse in route.ts (e.g. app/opengraph-image.tsx or route) or generateMetadata. 4. Favicon and icons: use file-based metadata (icon.png, apple-icon.png) in app/. 5. Ensure all pages have at least title and description.`,
  },
  {
    name: "Next.js error and loading UI",
    description: "Add error boundaries and loading states in the App Router.",
    steps: `1. error.tsx: must be a Client Component; receive { error, reset }, show message and reset button. 2. global-error.tsx: root-level error UI; must include html/body. 3. not-found.tsx: show 404; call notFound() from Server Component or Route Handler when resource missing. 4. loading.tsx: automatic Suspense boundary; show skeleton or spinner. 5. redirect() and permanentRedirect() for auth or moved routes. 6. Use unstable_rethrow in catch blocks to rethrow and let error.tsx handle.`,
  },
  // --- Platform: React + TypeScript ---
  {
    name: "React TypeScript component structure",
    description: "Write React components with TypeScript following best practices.",
    steps: `1. Use function declarations (not arrow functions) for components; PascalCase names. 2. Define props with an interface (e.g. IProps); destructure at top of component with defaults. 3. Type events: React.MouseEvent<HTMLButtonElement>, React.ChangeEvent<HTMLInputElement>. 4. Extend native props when needed: ComponentProps<'button'> or BoxProps. 5. Keep static values and constants outside the component; extract long helpers to avoid re-creation. 6. Prefer small child components over one giant return; default export at bottom.`,
  },
  {
    name: "React state and context",
    description: "Manage state and context in React without over-engineering.",
    steps: `1. One or two state values: useState. For more, use a single state object or useSetState-style hook. 2. Data one level down: pass props. Multiple levels or many consumers: useContext or global store (Zustand, etc.). 3. Put context provider in a separate .provider.tsx; export hook (e.g. useAppContext). 4. Scope providers as low as possible to limit rerenders. 5. Async state: use discriminated union (status: 'idle'|'loading'|'success'|'error') to avoid impossible states. 6. Business logic in domains/ or services; UI-specific logic in component folder.`,
  },
  {
    name: "React project structure (domain-based)",
    description: "Organize a React app with clear structure and domains.",
    steps: `1. Top-level: assets/, common/ (constants, types, utils), components/, pages/, domains/, infra/. 2. components/: common/, ui/, and size/feature folders; hooks/ and styles/ where used. 3. pages/: one folder per route (e.g. Home/, Account/); each has page component and optional sub-views. 4. domains/: one folder per domain (e.g. users/, posts/); put *Ops.ts (business logic), *Service.ts (API), and model types. 5. Name files after the component or domain; colocate tests (Component.test.tsx). 6. Keep paths centralized (e.g. domains/common/Paths.ts).`,
  },
  // --- Platform: Tailwind CSS ---
  {
    name: "Tailwind CSS components and layout",
    description: "Build responsive, accessible UI with Tailwind CSS.",
    steps: `1. Use utility classes for layout: flex, grid, gap, container; avoid arbitrary values unless needed. 2. Responsive: prefix with sm:, md:, lg:, xl: (e.g. md:flex-row). 3. Typography: text-sm/base/lg, font-medium, tracking-tight; use prose for markdown. 4. Colors: use theme tokens (e.g. bg-primary, text-muted-foreground); keep palette in tailwind.config or CSS variables. 5. Spacing: p-4, m-2, space-y-4 for consistency. 6. Dark mode: use dark: prefix or class strategy; prefer CSS variables for theming.`,
  },
  // --- Platform: Drizzle ORM ---
  {
    name: "Drizzle ORM schema and queries",
    description: "Define schema and write type-safe queries with Drizzle ORM.",
    steps: `1. Schema: use sqliteTable (or pgTable) with text(), integer(), etc.; add relations with relations(). 2. Migrations: drizzle-kit generate to create SQL; run via migrate script or drizzle-kit migrate. 3. Queries: use db.select().from(table).where(eq(...)); db.insert(table).values({...}); db.update(table).set({...}).where(eq(...)). 4. Use eq, and, or, sql from drizzle-orm for conditions; avoid raw SQL unless needed. 5. Export getDb() or similar; use schema object for type-safe selects. 6. For SQLite: better-sqlite3 or bun:sqlite driver; set dbCredentials in drizzle.config.`,
  },
  // --- Platform: Bun ---
  {
    name: "Bun HTTP server and routing",
    description: "Create an HTTP server or API with Bun's native APIs.",
    steps: `1. Create server: Bun.serve({ port, fetch(req) { ... } }); or use FileSystemRouter for file-based routes. 2. In fetch: parse URL with req.url and new URL(); method with req.method. 3. JSON body: await req.json(). 4. Return: new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }, status }). 5. Use Bun.file() for static files; stream with response = new Response(file). 6. WebSockets: upgrade in fetch and handle in websocket: { message, open, close }.`,
  },
  {
    name: "Bun SQLite and file I/O",
    description: "Use Bun's built-in SQLite and file APIs for scripts or backends.",
    steps: `1. SQLite: import { Database } from 'bun:sqlite'; const db = new Database('file.sqlite'). 2. Queries: db.query('SELECT * FROM t WHERE id = ?').get(id); .all() for array; .run() for INSERT/UPDATE. 3. Parameters: use ?1, ?2 or $name; bind in .get/.all/.run. 4. WAL: db.run('PRAGMA journal_mode = WAL;'). 5. File I/O: Bun.write(path, content), Bun.file(path).text(), .json(), .arrayBuffer(). 6. Use bun run script.ts or bun script.ts; bunfig.toml for config.`,
  },
  {
    name: "Bun script or CLI (TypeScript)",
    description: "Write and run TypeScript scripts or CLIs with Bun.",
    steps: `1. Use Bun as runtime: bun run script.ts or bun script.ts; no separate compile step. 2. Args: process.argv or parse with a small helper; env: process.env or Bun.env. 3. File system: import from 'node:fs' or use Bun.file/Bun.write. 4. HTTP: fetch() is built in; use for API calls. 5. Subprocess: Bun.spawn(['cmd', 'args'], { stdout: 'pipe' }). 6. Add shebang #!/usr/bin/env bun for executable scripts; chmod +x.`,
  },
  // --- Additional platforms ---
  {
    name: "shadcn/ui component usage",
    description: "Add or customize shadcn/ui components in a Next.js or React app.",
    steps: `1. Use npx shadcn@latest add [component] to install (Button, Card, Dialog, etc.). 2. Components live in components/ui/; customize by editing the generated files. 3. Use Radix primitives under the hood; style with Tailwind and CSS variables. 4. Theme: globals.css and tailwind.config use --background, --foreground, etc. 5. Prefer composition: wrap primitives in your layout; avoid changing node_modules. 6. Form: pair with react-hook-form and zod; use Form components from shadcn.`,
  },
  {
    name: "Zustand store pattern",
    description: "Create or extend a Zustand store for client state.",
    steps: `1. Define store: create((set, get) => ({ state, actions })). 2. Use set() for updates; use get() inside actions to read current state. 3. Split stores by domain (e.g. useProjectStore, useUIStore) to limit rerenders. 4. Persist if needed: persist middleware with storage (localStorage, etc.). 5. Selectors: useStore(s => s.field) to subscribe to a slice. 6. Keep actions as plain functions that call set; avoid async in set unless using a pattern for loading.`,
  },
];

async function main() {
  console.log("Seeding skills...");
  let created = 0;
  let skipped = 0;
  const { listSkills } = await import("../src/backend/skills");
  const existing = await listSkills();
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase().trim()));

  for (const skill of SKILLS) {
    if (existingNames.has(skill.name.toLowerCase().trim())) {
      skipped++;
      continue;
    }
    try {
      await createSkill(skill.name, skill.description, skill.steps);
      created++;
      console.log("  +", skill.name);
    } catch (err) {
      console.warn("  failed:", skill.name, err);
    }
  }

  console.log(`Done. Created: ${created}, Skipped (already exist): ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
