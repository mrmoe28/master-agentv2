# Agent Chat Tests

Tests each function used by the in-app agent chat (send email, open tabs, extract from web, desktop tools) via **subagents**: focused test runners that run natural-language prompts and assert the correct tools are called and succeed.

## Run

```bash
npm run test:agent-chat
```

Runs three subagents in sequence:

1. **Email subagent** – Prompt: send an email to `test@example.com` (uses `send_email`; requires Gmail or SendGrid).
2. **Browser subagent** – Prompt: open `https://example.com` and extract main text (uses `browser_navigate`, `browser_extract`; requires Playwright/Chrome).
3. **Desktop subagent** – Prompts: open URL in default browser (`open_url`), create a file on Desktop (`create_file`).

## Prerequisites

- **LLM**: `OPENAI_API_KEY` in `.env` (or Ollama running).
- **Email**: Gmail connected in the app or `SENDGRID_API_KEY` in `.env` (otherwise send_email returns "not configured" and the test fails).
- **Browser**: Playwright Chromium (or `CHROME_CDP_URL` to attach to an existing Chrome).
- **Desktop**: `open_url` and `create_file` run on the host machine (Desktop path is OS-specific).

## Output

- Per-test: `[OK]` or `[FAIL]`, prompt snippet, detail, and tools used.
- Final **SUMMARY**: total passed/failed and "Works" / "Does not work" by subagent.
