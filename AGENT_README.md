# Autonomous Planning Agent

Goal → Plan → Tasks → Subagents (executor) with chain-of-thought, tool selection, self-evaluation, retry logic, long-running loops, and memory updates after each task.

## Run

```bash
# Set your OpenAI API key (required)
export OPENAI_API_KEY=sk-your-key

# Run with default goal: "Organize all leads, email them, schedule followups"
npm run agent

# Or pass a goal
npm run agent "Organize all leads, email them, schedule followups"
```

## Architecture

- **Planner** (`src/planner.ts`): Takes user goal + memory → produces a plan (reasoning + ordered tasks with tool hints).
- **Executor** (`src/executor.ts`): For each task: chain-of-thought reasoning → tool selection → runs tools → records result → **updates memory** after each task.
- **Evaluator** (`src/evaluator.ts`): After execution, evaluates success/failure and decides **retry** or done.

Flow: **Goal → Plan → Tasks (topological order) → Executor runs each task (CoT + tools) → Memory updated per task → Evaluator → Retry loop** (up to `maxIterations`).

## Features

- **Goal → plan → tasks → subagents**: Planner outputs tasks; executor acts as subagent per task (reasoning + tool calls).
- **Chain-of-thought**: Planner and executor prompts ask for step-by-step reasoning.
- **Tool selection**: Executor chooses tools from registry (parse_leads, send_emails, schedule_followups, update_crm, report_results).
- **Self-evaluation**: Evaluator scores outcome and sets `shouldRetry` and `retrySuggestions`.
- **Retry logic**: Main loop re-plans and re-runs when evaluator says `shouldRetry` (up to `maxIterations`).
- **Long-running loops**: Agent runs until success or `maxIterations` (default 5).
- **Memory updates after each task**: `recordTaskResult` and `addMemoryEntry` called after every task; recent context fed into planner/executor/evaluator.

## Tools (demo)

- `parse_leads` / `get_leads_summary`: Organize leads (in-memory demo data).
- `send_emails`: Send emails to recipients (logs + report section).
- `schedule_followups`: Schedule follow-up meetings (logs + report section).
- `update_crm`: Update lead status in CRM (in-memory).
- `report_results`: Aggregate and return final report.

Replace with real integrations (Gmail, Calendar, CRM APIs) as needed.

## Entry point

- **CLI**: `src/run-agent.ts` (no integration imports). Use `npm run agent`.
- **Library**: `src/agent.ts` exports `runAutonomousAgent(goalDescription, options?)`.
