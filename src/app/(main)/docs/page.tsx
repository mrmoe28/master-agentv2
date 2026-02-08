"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Docs" showPanelButtons={false} />
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              What is Master Agent OS?
            </h2>
            <p className="text-sm text-muted-foreground">
              Master Agent OS is a local-first AI control dashboard. You talk to
              a single agent in plain language; it uses tools (email, calendar,
              browser automation, files, web search, skills) to get things done.
              It can remember past conversations, follow stored procedures
              (skills), and optionally run an autonomous plan-execute-evaluate
              loop with sub-agents via a task queue.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Chat</h2>
            <p className="text-sm text-muted-foreground">
              The main Chat view is where you talk to the agent. Type a goal or
              question (e.g. “send an email to X”, “extract names from this
              PDF”, “search for how to do Y”). The agent chooses which tools to
              call and responds in the thread. You can attach images and
              documents; the agent can send email, open URLs, fill forms,
              extract data from pages, search the web, create files and
              folders, and run saved skills. Use “Clear chat” to start a new
              thread; “Start autonomous run” kicks off the optional
              plan-execute-evaluate loop for the current project.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Projects
            </h2>
            <p className="text-sm text-muted-foreground">
              Projects group goals, tasks, and chat context. You can create
              multiple projects and switch between them. Each project has its
              own goals (editable via “Edit goals”) and chat history. The agent
              uses the active project’s goals when planning autonomous runs.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Agents & Tasks
            </h2>
            <p className="text-sm text-muted-foreground">
              In the normal Chat flow, one agent handles your request and uses
              tools. For “Start autonomous run”, the system can break work into
              tasks and run them (optionally in parallel via a BullMQ queue and
              workers). The Agents and Tasks views show status of those
              sub-agents and tasks. You only need Redis and the backend worker
              if you use the autonomous orchestration; the regular chat does not
              require them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              History
            </h2>
            <p className="text-sm text-muted-foreground">
              History lists past chat turns (query and summary) for the active
              project. You can search and open previous conversations. This
              helps you resume context and see what the agent did before.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Memory
            </h2>
            <p className="text-sm text-muted-foreground">
              The agent has long-term memory: it stores conversation turns in a
              vector store (LanceDB) and extracts learnings (facts, preferences,
              context). When you chat, relevant past experience is retrieved
              and injected into the agent’s context. You can ask “what have you
              learned?” or “do you remember our last conversation?” and it will
              use this stored data. Memory persists in the app data directory
              (or ./data if APP_DATA_DIR is not set).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Skills
            </h2>
            <p className="text-sm text-muted-foreground">
              Skills are stored procedures the agent can follow. Each skill has a
              name, description, and step-by-step instructions. When you ask for
              something that matches a skill (e.g. “review this code”, “add unit
              tests”), the agent can load that skill and follow its steps. You
              can create skills via chat (e.g. “save a skill for how to deploy
              this app”) or seed them with the db:seed-skills script. The Skills
              page lists and manages them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Integrations
            </h2>
            <p className="text-sm text-muted-foreground">
              Integrations connect the agent to external services. Google:
              connect one account for Gmail, Calendar, and Drive (OAuth). The
              agent can send email via Gmail, create events, and use Drive.
              Twilio: SMS and voice (set account SID, auth token, phone number in
              .env or Settings). SendGrid: transactional email (API key and
              from-address). For Google, add the exact redirect URI shown on the
              Integrations page to your OAuth client in Google Cloud Console.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Settings
            </h2>
            <p className="text-sm text-muted-foreground">
              Settings lets you manage API keys (OpenAI, SendGrid, Twilio,
              optional OPENAI_BASE_URL and OLLAMA_HOST) and view model config.
              If OPENAI_API_KEY is set, the agent uses that (or OPENAI_BASE_URL
              for a local OpenAI-compatible API). If not, it uses local Ollama
              (OLLAMA_HOST, default http://localhost:11434). You can also
              toggle dark mode here.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              How the agent decides what to do
            </h2>
            <p className="text-sm text-muted-foreground">
              You ask in natural language; the agent does not expect you to
              specify function names or JSON. It has a system prompt that
              describes its tools (email, browser, desktop, search, skills) and
              rules (e.g. use web_search for “search for” queries, use
              send_email only when you ask to send email, return structured
              lists in the chat when you ask for extractions). It chooses which
              tool to call and with what arguments, then responds with the
              result. For ambiguous requests it may ask a short clarifying
              question or state what it will do first.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Environment and data
            </h2>
            <p className="text-sm text-muted-foreground">
              Put secrets and config in .env (see .env.example). Important:
              GOOGLE_REDIRECT_URI must be http://localhost:6001/api/integrations/google/callback
              (or your app’s origin + that path) and match Google Cloud Console
              exactly. Set APP_DATA_DIR to an absolute path if you want OAuth
              tokens, API keys stored in the app, and LanceDB memory to persist
              across restarts and different working directories. Redis is only
              needed for the optional autonomous agent queue (npm run agent +
              backend worker).
            </p>
          </section>

          <section>
            <Card className="border-muted/50 bg-muted/30 p-4">
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Quick reference
              </h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Chat: talk to the agent; it uses tools automatically.</li>
                <li>Projects: group goals and history; switch in the sidebar.</li>
                <li>Autonomous run: optional; requires Redis + worker.</li>
                <li>Memory: long-term store; ask “what have you learned?”</li>
                <li>Skills: stored procedures; create in chat or seed.</li>
                <li>Integrations: Google, Twilio, SendGrid in one place.</li>
                <li>Each PC: use local Ollama (localhost) to avoid overloading one instance.</li>
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
