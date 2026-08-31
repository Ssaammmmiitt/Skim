"use client";

import { useEffect, useRef, useState } from "react";
import { ChatErrorPanel } from "@/components/chat/ChatErrorPanel";
import { ChatLoadingBubble } from "@/components/chat/ChatLoadingBubble";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import type {
  ChatApiError,
  ChatApiResponse,
  ChatMessage as ChatMessageType,
} from "@/lib/types";

const SUGGESTED_PROMPTS = [
  "What happened in AI this week?",
  "Any major startup funding news?",
  "Summarize the biggest security stories lately",
  "What's new in web development?",
];

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChatApiError | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [loadingSessionKey, setLoadingSessionKey] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((response) => response.json())
      .then((body) => {
        if (typeof body.remaining === "number") {
          setRemaining(body.remaining);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessageType = {
      id: newMessageId(),
      role: "user",
      content: trimmed,
    };

    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setLoadingSessionKey(newMessageId());
    setError(null);
    setLastFailedMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const body = (await response.json()) as ChatApiResponse & ChatApiError;

      if (!response.ok) {
        setLastFailedMessage(trimmed);
        setError({
          error: body.error ?? "Failed to get a response",
          error_code: body.error_code,
          provider: body.provider,
          model: body.model,
          retry_after_seconds: body.retry_after_seconds,
          tried_providers: body.tried_providers,
          details: body.details,
        });
        return;
      }

      if (typeof body.remaining === "number") {
        setRemaining(body.remaining);
      }

      const assistantMessage: ChatMessageType = {
        id: newMessageId(),
        role: "assistant",
        content: body.answer,
        sources: body.sources,
        retrieval_method: body.retrieval_method,
        provider: body.provider,
        model: body.model,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setLastFailedMessage(trimmed);
      setError({
        error: err instanceof Error ? err.message : "Something went wrong",
        error_code: "unknown",
      });
    } finally {
      setLoading(false);
      setLoadingSessionKey(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function handleRetry() {
    const text = lastFailedMessage ?? input;
    if (text.trim()) {
      void sendMessage(text);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        className="mb-4 shrink-0 sm:mb-6"
        eyebrow="RAG Chat"
        title="Ask Skim"
        description="Hybrid search over the article corpus, then multi-provider AI."
        action={
          remaining != null ? (
            <div className="text-right">
              <p className="text-xs font-medium text-secondary">
                {remaining} question{remaining === 1 ? "" : "s"} left today
              </p>
              <p className="text-[10px] text-muted">20 queries/day</p>
            </div>
          ) : undefined
        }
      />

      <div
        className={cn(
          ui.card,
          "flex min-h-0 flex-1 flex-col overflow-hidden"
        )}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {messages.length === 0 ? (
            <div className="py-6 text-center sm:py-8">
              <p className={ui.body}>
                Try asking about recent tech news in the Skim corpus.
              </p>
              <p className="mt-2 text-xs text-muted">
                Hybrid vector + full-text retrieval · Gemini with fallbacks
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={loading || remaining === 0}
                    className="max-w-full rounded-full border border-surface-raised bg-canvas px-3 py-2 text-left text-xs text-secondary transition hover:border-cyan-core hover:text-cyan-bright disabled:opacity-50 sm:text-center"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {loading && loadingSessionKey ? (
            <ChatLoadingBubble key={loadingSessionKey} sessionKey={loadingSessionKey} />
          ) : null}

          {error ? (
            <ChatErrorPanel error={error} onRetry={handleRetry} />
          ) : null}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-surface-raised bg-surface/50 p-3 sm:p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about recent tech news…"
              rows={2}
              disabled={loading || remaining === 0}
              className={cn(ui.textarea, "sm:flex-1")}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || remaining === 0}
              className={cn(ui.btnPrimary, "w-full shrink-0 sm:w-auto sm:px-6")}
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Enter to send · Shift+Enter for newline
          </p>
        </form>
      </div>
    </div>
  );
}
