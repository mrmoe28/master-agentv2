import { NextResponse } from "next/server";
import { chatWithTools, chat } from "@/llm/client";
import type { ChatMessage, ChatContentPart } from "@/llm/client";
import { desktopToolDefs } from "@/llm/desktop-tools";
import { chatIntegrationToolDefs } from "@/llm/chat-integration-tools";
import { browserToolDefs } from "@/llm/browser-tools";
import { searchToolDefs } from "@/llm/search-tools";
import { skillToolDefs } from "@/llm/skill-tools";
import { runWithBrowserSession } from "@/browser-session";
import { setIntegrationContext } from "@/integration-context";
import { IntegrationService } from "@/services/integration-service";
import { defaultTokenStore } from "@/integrations/token-store";
import { addRAGDocument, ragRetrieve, addLearning, getAllLearnings } from "@/backend";

function buildMessageContent(
  content: string,
  imageUrls?: string[]
): string | ChatContentPart[] {
  if (!imageUrls?.length) return content;
  const parts: ChatContentPart[] = [
    { type: "text", text: content },
    ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];
  return parts;
}

const SYSTEM_PROMPT = `You are the Master Agent in an autonomous agent system. You help the user by answering questions, explaining what the system can do (planning, delegating to sub-agents, integrations like Gmail, Calendar, SendGrid, Twilio), and suggesting next steps.

## How you work
The user asks in plain language (e.g. "extract name and phone from this screen", "send an email to X", "open this URL"). You have tools (send_email, browser_navigate, browser_extract, etc.)—you decide which tool to call and call it yourself. Never ask the user to "provide a function call", "specify a function", or supply function names/parameters in any format (e.g. JSON). Do not respond with instructions like "provide the function name and parameters in the format {...}". The user does not need to know about function calls; they just ask in natural language, and you use your tools to do it.

## Documents (PDF and CSV)
When the user attaches PDF or CSV files, the message will include "[Attached file: filename]" followed by the extracted text or CSV content. You can:
- Summarize the document in a few sentences or bullet points.
- Extract key information (names, dates, numbers, main conclusions, headers and rows from CSV).
- Answer questions about the content or compare multiple attached files.

**Structured output for lists and extractions:** When the user asks for a "list of names", "contact information", "extract", or "make a list" from an attached file, you MUST respond in the chat with a **structured** answer—never a single long raw string or CSV dump. Use one of these formats:
- **Markdown table**: header row with column names (e.g. Name, City, State, Status), then one row per record. Use pipe characters and line breaks so it renders as a table.
- **JSON array**: an array of objects with clear keys (e.g. \`[{"name":"...","city":"...","state":"..."}]\`). Use the CSV headers or obvious fields (name, city, state, status, etc.) as keys.
Do not put the raw file content or a giant unformatted string in your response. Do not use send_email for "list" or "extract" requests unless the user explicitly asks to email the list to someone—for "make a list" or "extract names/contacts", the answer is the structured list in your chat reply only.

## Reasoning and instruction-following
- When the user gives compound instructions (e.g. "open this URL, click this button, extract this information"), treat them as a list of steps. In your mind, break the request into steps and address them in order.
- Before acting: consider which steps you can do with your tools and which you cannot. Say clearly what you will do and what you cannot do (and why), then do the steps you can.
- Prefer doing one logical step at a time when possible: use a tool, then use the result to decide the next step. Do not guess or combine steps in a way that contradicts the user's order. Never repeat the same step in a loop (e.g. do not call browser_navigate to the same URL more than once; after success, move to the next step).
- If the user's request is ambiguous, briefly state your understanding and what you will do first, then act.

## Your capabilities (stay within these)
- Email: use the send_email tool only when the user explicitly asks to send an email to someone. Put the full email text in the "body" parameter—never leave body empty. Do not use send_email to "return" or "show" a list or extraction; for those, reply in the chat with a structured table or JSON as above.
- Desktop: create_folder, create_file, open_url. Paths can be relative to the workspace (or Desktop with on_desktop: true) or absolute. open_url opens a URL in the user's default browser (separate from the automation browser).
- Browser automation (for "open this URL, click this button, extract this"): use browser_navigate(url) first, then browser_snapshot to see links/buttons, then browser_click(selector), browser_fill(selector, value), and browser_extract(scope) as needed. Use one tool per step. Selectors: role:button:Login, text:Submit, label:Email, placeholder:Search, or CSS like #id. For extract, scope is 'full', 'body', or a CSS selector. You can click, fill forms, and extract content from live pages with these tools. If the user says the page is already open or they are already logged in, use browser_navigate with the exact URL they gave once; if the tool returns "already open" or "Using already open tab", do NOT call browser_navigate again for that URL—proceed immediately to the next step (browser_snapshot, browser_click, or browser_extract). Never call browser_navigate multiple times in a row for the same URL; one success means move on. If browser_extract returns empty or very little text, use browser_snapshot to see the page structure (headings, links), then try browser_extract again with a specific CSS selector (e.g. main, .content, [role="main"]) instead of giving up.
- Sign-in: When the user asks you to sign in to a site and provides the URL and credentials (email/username and password), do it with browser tools: (1) browser_navigate(loginUrl), (2) browser_snapshot to find the email and password field selectors (e.g. label:Email, placeholder:Email, label:Password), (3) browser_fill for the email/username field, (4) browser_fill for the password field, (5) browser_click on the sign-in button (e.g. role:button:Sign in, text:Log in, or the selector from the snapshot). Confirm when sign-in succeeds or report the error from the page.
- Web search: when the user says "search for", "look up", "find", or "how to" something, you MUST call web_search(query) first with a clear search query. Do NOT use browser_navigate to perform a search—only use browser_navigate when the user gives a specific URL to open. If web_search returns a config error, tell the user to set search in Settings: either Google (GOOGLE_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID) or Serper (SERPER_API_KEY). Do not open a browser instead.
- Skills: save procedures with create_skill (name, description, steps). Store concrete, actionable steps (the actual procedure to follow), not the user's prompt or a meta-instruction like "create a skill with...". When you create_skill or when the user asks what skills you have, you MUST show the full skill in your reply: name, description, and the steps. Do not only say "I saved it" or list skill names—display the actual procedure (steps) so the user sees the skill, not just the prompt. When saving from search results, put the real how-to steps into the steps field.

Critical: If the user says emails must only go to a particular address (e.g. "only send emails to X"), always use that address as the "to" parameter for send_email. Never use a different recipient from context unless the user explicitly asks. Put any third-party info in the email body and send only to the user-specified address.

Be concise and helpful.

## Long-term memory
You have access to long-term memory: relevant past conversations and experience may be provided below in a "Relevant past experience" section. Use that context to inform your answers. When the user asks whether you remember past conversations or can recall previous sessions, say yes—you can recall relevant past experience from memory and use it in this conversation. Do not claim you only remember the current session or have no external memory when such context is available.

You learn from every interaction: facts, preferences, and context are stored. When the user asks what you have learned, what you know, or to list everything you've learned, use the "What you have learned" section below (if present) and list every item clearly. If that section is empty, say you have not stored any learnings yet.`;

const DEFAULT_USER_ID = "default";

/** Heuristic: user is asking about memory / remembering / past conversations. */
function isMemoryRelatedQuery(content: string): boolean {
  const lower = (typeof content === "string" ? content : "").toLowerCase();
  const terms = ["remember", "recall", "past conversation", "our conversation", "previous chat", "memory", "do you remember", "can you remember"];
  return terms.some((t) => lower.includes(t));
}

/** Heuristic: user is asking to search the web (must use web_search, not browser). */
function isSearchForQuery(content: string): boolean {
  const lower = (typeof content === "string" ? content : "").toLowerCase();
  const terms = [
    "search for",
    "look up",
    "look up how",
    "find out",
    "find out how",
    "how to",
    "search the web",
    "google ",
    "look for ",
  ];
  return terms.some((t) => lower.includes(t));
}

/** Heuristic: user is asking what the agent has learned (list all learnings). */
function isLearningsListQuery(content: string): boolean {
  const lower = (typeof content === "string" ? content : "").toLowerCase();
  const terms = [
    "what have you learned",
    "what has it learned",
    "what have we learned",
    "list what you've learned",
    "list what you have learned",
    "everything you've learned",
    "everything you have learned",
    "what do you know about me",
    "what have you remembered",
    "summarize what you learned",
  ];
  return terms.some((t) => lower.includes(t));
}

const EXTRACT_LEARNINGS_SYSTEM = `You extract learnings from a single conversation turn. Given the user message and the assistant reply, output 0-5 discrete learnings: facts about the user, preferences, decisions, or context that would help in future conversations. Output one short sentence per learning, one per line. Do not number or bullet. If there is nothing to learn from this exchange, output exactly: NOTHING`;

/** Extract learnings from user + assistant text via LLM; returns array of non-empty strings. */
async function extractLearnings(userMessage: string, assistantReply: string): Promise<string[]> {
  if (!userMessage?.trim() && !assistantReply?.trim()) return [];
  const block = `User said: ${userMessage.slice(0, 800)}\n\nAssistant replied: ${assistantReply.slice(0, 800)}`;
  try {
    const out = await chat(
      [{ role: "system", content: EXTRACT_LEARNINGS_SYSTEM }, { role: "user", content: block }],
      { temperature: 0.2, maxTokens: 512 }
    );
    const lines = (out ?? "")
      .split(/\n/)
      .map((s) => s.replace(/^[\d.)\-\*]+\s*/, "").trim())
      .filter((s) => s.length > 0 && !/^NOTHING$/i.test(s) && s.length <= 300);
    return lines.slice(0, 5);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    setIntegrationContext({
      integrationService: new IntegrationService({ tokenStore: defaultTokenStore }),
      userId: DEFAULT_USER_ID,
    });

    const body = (await request.json()) as {
      messages?: Array<{ role: string; content: string; imageUrls?: string[] }>;
    };
    const raw = body?.messages;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty messages array." },
        { status: 400 }
      );
    }
    const filteredRaw = raw
      .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
      .map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: buildMessageContent(
          String(m.content),
          Array.isArray(m.imageUrls) ? m.imageUrls : undefined
        ),
      }))
      .filter((m) => ["system", "user", "assistant"].includes(m.role));

    // Retrieve relevant past experience from long-term memory for context
    let memoryContext = "";
    const lastUserContent = filteredRaw.filter((m) => m.role === "user").pop();
    const queryForRetrieval =
      typeof lastUserContent?.content === "string"
        ? lastUserContent.content
        : "";
    const isMemoryQuestion = isMemoryRelatedQuery(queryForRetrieval);
    try {
      const limit = isMemoryQuestion ? 8 : 5;
      const pastByQuery =
        queryForRetrieval.trim()
          ? await ragRetrieve(queryForRetrieval, { limit })
          : [];
      // When user asks about memory/remembering, also retrieve by generic conversation query so we surface past turns even if the literal question doesn't match well
      const pastByFallback =
        isMemoryQuestion
          ? await ragRetrieve("user asked assistant replied previous conversation", { limit: 5 })
          : [];
      const seen = new Set<string>();
      const combined = [...pastByQuery];
      for (const r of pastByFallback) {
        if (!seen.has(r.text)) {
          seen.add(r.text);
          combined.push(r);
        }
      }
      if (combined.length > 0) {
        memoryContext = combined.map((r) => r.text).join("\n\n");
      }
    } catch {
      // Continue without memory if retrieval fails
    }

    // When user asks what the agent has learned, inject full list of learnings so the agent can list them
    let learningsListSection = "";
    if (isLearningsListQuery(queryForRetrieval)) {
      try {
        const all = await getAllLearnings();
        learningsListSection =
          "\n\n## What you have learned (list these when the user asks)\n" +
          (all.length > 0
            ? all.map((l, i) => `${i + 1}. ${l.content}`).join("\n")
            : "(No learnings stored yet.)");
      } catch {
        learningsListSection =
          "\n\n## What you have learned (list these when the user asks)\n(Unable to load learnings.)";
      }
    }

    // When user asks to "search for" something: force web_search first and save as skill if it's a procedure
    let searchAndLearnHint = "";
    if (isSearchForQuery(queryForRetrieval)) {
      searchAndLearnHint =
        "\n\n## Important: user asked to search\n" +
        "1. Call web_search with a clear query first. Do NOT use browser_navigate to search.\n" +
        "2. If web_search returns a config error, tell the user to set Google (GOOGLE_API_KEY + GOOGLE_CUSTOM_SEARCH_ENGINE_ID) or Serper (SERPER_API_KEY) in Settings and stop.\n" +
        "3. If the search is about a how-to, procedure, or steps, call create_skill with a short name and with concrete steps (the actual actions to do)—not the user prompt. In your reply, show the full skill (name, description, steps) so the user sees the procedure, not just that you saved it.";
    }

    const systemContent =
      SYSTEM_PROMPT +
      (memoryContext
        ? `\n\n## Relevant past experience (use to inform your answer)\n${memoryContext}`
        : "") +
      learningsListSection +
      searchAndLearnHint;

    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...filteredRaw,
    ];
    if (messages.length <= 1) {
      return NextResponse.json(
        { error: "At least one user or assistant message is required." },
        { status: 400 }
      );
    }
    const allTools = [
      ...desktopToolDefs,
      ...chatIntegrationToolDefs,
      ...browserToolDefs,
      ...searchToolDefs,
      ...skillToolDefs,
    ];
    const { content, toolResults } = await runWithBrowserSession(() =>
      chatWithTools(messages, allTools, {
        temperature: 0.3,
        maxTokens: 4096,
      })
    );

    // Persist this conversation turn to long-term memory for learning
    const lastUserMessage = raw.filter((m) => m?.role === "user").pop();
    const userQuery =
      typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : "";
    const summary =
      typeof content === "string"
        ? content.slice(0, 500).replace(/\s+/g, " ").trim()
        : "";
    if (userQuery || summary) {
      const memoryText = [
        userQuery ? `User asked: ${userQuery}` : "",
        summary ? `Assistant: ${summary}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      addRAGDocument(memoryText, {
        type: "conversation",
        timestamp: new Date().toISOString(),
      }).catch((err) =>
        console.warn("[chat API] Failed to persist to long-term memory:", err)
      );
    }

    // Extract and store discrete learnings from this turn (async; do not block response)
    if (userQuery || summary) {
      extractLearnings(userQuery, summary)
        .then((learnings) => {
          return Promise.all(
            learnings.map((text) => addLearning(text, { dedupeByContent: true }))
          );
        })
        .catch((err) =>
          console.warn("[chat API] Failed to extract/store learnings:", err)
        );
    }

    return NextResponse.json({ content, toolResults });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chat API]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
