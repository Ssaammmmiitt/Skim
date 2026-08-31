"use client";

import { useEffect, useRef } from "react";
import { ChatErrorPanel } from "@/components/chat/ChatErrorPanel";
import { ChatLoadingBubble } from "@/components/chat/ChatLoadingBubble";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

const SUGGESTED_PROMPTS = [
  "What happened in AI this week?",
  "Any major startup funding news?",
  "Summarize the biggest security stories lately",
  "What's new in web development?",
];

export function ChatInterface() {
  const messages = useChatStore((state) => state.messages);
  const input = useChatStore((state) => state.input);
  const loading = useChatStore((state) => state.loading);
  const error = useChatStore((state) => state.error);
  const remaining = useChatStore((state) => state.remaining);
  const loadingSessionKey = useChatStore((state) => state.loadingSessionKey);
  const setInput = useChatStore((state) => state.setInput);
  const fetchQuota = useChatStore((state) => state.fetchQuota);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const retryLast = useChatStore((state) => state.retryLast);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchQuota();
  }, [fetchQuota]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

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
            <ChatErrorPanel error={error} onRetry={() => void retryLast()} />
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
