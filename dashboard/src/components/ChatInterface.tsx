"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import type { ChatApiResponse, ChatMessage as ChatMessageType } from "@/lib/types";

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
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((response) => response.json())
      .then((body) => {
        if (typeof body.remaining === "number") {
          setRemaining(body.remaining);
        }
      })
      .catch(() => {
        // Quota display is optional.
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const body = (await response.json()) as ChatApiResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to get a response");
      }

      if (typeof body.remaining === "number") {
        setRemaining(body.remaining);
      }

      const assistantMessage: ChatMessageType = {
        id: newMessageId(),
        role: "assistant",
        content: body.answer,
        sources: body.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col">
      <header className="mb-4 shrink-0">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
          RAG Chat
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold text-[#f0f9ff]">Ask Skim</h1>
          {remaining != null ? (
            <p className="text-xs text-[#64748b]">
              {remaining} question{remaining === 1 ? "" : "s"} left today
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-[#94a3b8]">
          Ask questions about articles Skim has ingested. Answers cite sources
          from the corpus.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-[#243044] bg-[#1a2332]/40">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#94a3b8]">
                Try asking about recent tech news in the Skim corpus.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={loading}
                    className="rounded-full border border-[#243044] bg-[#0f1419] px-3 py-2 text-xs text-[#94a3b8] hover:border-[#06b6d4] hover:text-[#22d3ee]"
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

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-[20px] border border-[#243044] bg-[#1a2332] px-4 py-3">
                <p className="text-sm text-[#94a3b8]">Skim is thinking…</p>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {error ? (
          <p className="border-t border-[#243044] px-4 py-2 text-sm text-[#f87171]">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-[#243044] p-4"
        >
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about recent tech news…"
              rows={2}
              disabled={loading || remaining === 0}
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-[#243044] bg-[#0f1419] px-4 py-3 text-sm text-[#f0f9ff] outline-none placeholder:text-[#64748b] focus:border-[#06b6d4] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || remaining === 0}
              className="self-end rounded-full bg-[#06b6d4] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-black hover:bg-[#22d3ee] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#64748b]">
            Enter to send · Shift+Enter for newline · 20 queries/day
          </p>
        </form>
      </div>
    </div>
  );
}
