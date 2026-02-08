"use client";

import { User, Bot } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/80 text-foreground"
        )}
      >
        {message.thoughts && message.thoughts.length > 0 && (
          <div className="mb-2 space-y-1 border-b border-border/50 pb-2">
            <span className="text-xs font-medium opacity-80">Thoughts</span>
            {message.thoughts.map((t, i) => (
              <p key={i} className="text-xs opacity-90">
                {t}
              </p>
            ))}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-1 border-b border-border/50 pb-2">
            <span className="text-xs font-medium opacity-80">Tool calls</span>
            {message.toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="rounded bg-background/20 px-2 py-1 text-xs"
              >
                <span className="font-mono">{tc.name}</span>
                {tc.output && (
                  <pre className="mt-1 whitespace-pre-wrap text-[10px]">
                    {tc.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.imageUrls.map((url, i) => (
              <Image
                key={i}
                src={url}
                alt=""
                width={128}
                height={128}
                unoptimized
                className="max-h-32 rounded border border-border object-contain"
              />
            ))}
          </div>
        )}
        {message.fileAttachments && message.fileAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.fileAttachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs"
              >
                <span className="truncate max-w-[120px]" title={att.name}>
                  {att.name}
                </span>
                {att.blobUrl && (
                  <a
                    href={att.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-current align-middle" />
          )}
        </p>
        <span className="text-[10px] opacity-70">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
