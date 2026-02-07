/**
 * Desktop autonomy tool definitions for the in-app assistant (chatWithTools).
 */

import type { ChatToolDef } from "./client";
import { createFolder, createFile, openUrl } from "@/tools/desktop";

export const desktopToolDefs: ChatToolDef[] = [
  {
    name: "create_folder",
    description: "Create a directory (folder) on the user's machine. Use a path relative to the workspace (or Desktop if on_desktop is true) or any absolute path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Folder path (relative to workspace/Desktop or absolute)" },
        on_desktop: { type: "boolean", description: "If true, relative path is resolved under the user's Desktop." },
      },
      required: ["path"],
    },
    execute: async (args) => {
      const pathArg = typeof args.path === "string" ? args.path : String(args.path ?? "");
      const onDesktop = args.on_desktop === true || args.on_desktop === "true";
      const result = createFolder(pathArg, { onDesktop });
      return JSON.stringify(result);
    },
  },
  {
    name: "create_file",
    description: "Create or overwrite a file with the given content. Use a path relative to the workspace (or Desktop if on_desktop is true) or any absolute path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path (relative to workspace/Desktop or absolute)" },
        content: { type: "string", description: "File content (plain text)" },
        on_desktop: { type: "boolean", description: "If true, relative path is resolved under the user's Desktop." },
      },
      required: ["path", "content"],
    },
    execute: async (args) => {
      const pathArg = typeof args.path === "string" ? args.path : String(args.path ?? "");
      const content = typeof args.content === "string" ? args.content : String(args.content ?? "");
      const onDesktop = args.on_desktop === true || args.on_desktop === "true";
      const result = createFile(pathArg, content, { onDesktop });
      return JSON.stringify(result);
    },
  },
  {
    name: "open_url",
    description:
      "Open a URL in the user's default web browser (user sees the page). For automated click/fill/extract on a page, use browser_navigate and other browser_* tools instead.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL (e.g. https://example.com)" },
      },
      required: ["url"],
    },
    execute: async (args) => {
      const url = typeof args.url === "string" ? args.url : String(args.url ?? "");
      const result = openUrl(url);
      return JSON.stringify(result);
    },
  },
];
