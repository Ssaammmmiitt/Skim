import { create } from "zustand";
import type {
  ChatApiError,
  ChatApiResponse,
  ChatMessage,
} from "@/lib/types";

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ChatState = {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: ChatApiError | null;
  remaining: number | null;
  lastFailedMessage: string | null;
  loadingSessionKey: string | null;
  setInput: (value: string) => void;
  fetchQuota: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  retryLast: () => Promise<void>;
  reset: () => void;
};

const initialChatState = {
  messages: [] as ChatMessage[],
  input: "",
  loading: false,
  error: null as ChatApiError | null,
  remaining: null as number | null,
  lastFailedMessage: null as string | null,
  loadingSessionKey: null as string | null,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialChatState,

  setInput: (value) => set({ input: value }),

  fetchQuota: async () => {
    try {
      const response = await fetch("/api/chat");
      const body = await response.json();
      if (typeof body.remaining === "number") {
        set({ remaining: body.remaining });
      }
    } catch {
      // Quota display is optional.
    }
  },

  sendMessage: async (text) => {
    const trimmed = text.trim();
    const { loading, messages } = get();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: newMessageId(),
      role: "user",
      content: trimmed,
    };

    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    set((state) => ({
      messages: [...state.messages, userMessage],
      input: "",
      loading: true,
      loadingSessionKey: newMessageId(),
      error: null,
      lastFailedMessage: null,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const body = (await response.json()) as ChatApiResponse & ChatApiError;

      if (!response.ok) {
        set({
          lastFailedMessage: trimmed,
          error: {
            error: body.error ?? "Failed to get a response",
            error_code: body.error_code,
            provider: body.provider,
            model: body.model,
            retry_after_seconds: body.retry_after_seconds,
            tried_providers: body.tried_providers,
            details: body.details,
          },
        });
        return;
      }

      const assistantMessage: ChatMessage = {
        id: newMessageId(),
        role: "assistant",
        content: body.answer,
        sources: body.sources,
        retrieval_method: body.retrieval_method,
        provider: body.provider,
        model: body.model,
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        remaining:
          typeof body.remaining === "number" ? body.remaining : state.remaining,
      }));
    } catch (err) {
      set({
        lastFailedMessage: trimmed,
        error: {
          error: err instanceof Error ? err.message : "Something went wrong",
          error_code: "unknown",
        },
      });
    } finally {
      set({ loading: false, loadingSessionKey: null });
    }
  },

  retryLast: async () => {
    const { lastFailedMessage, input } = get();
    const text = lastFailedMessage ?? input;
    if (text.trim()) {
      await get().sendMessage(text);
    }
  },

  reset: () => set(initialChatState),
}));

export function resetChatStore(): void {
  useChatStore.getState().reset();
}
