import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { SourceCitation } from "@/components/chat/SourceCitation";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type ChatMessageProps = {
  message: ChatMessageType;
};

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[0-9,\s]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-on-canvas">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[\d[\d,\s]*\]$/.test(part)) {
      return (
        <span key={i} className="font-mono text-[11px] font-semibold text-wire">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-5 py-4",
          isUser
            ? "border border-border-on-dark bg-on-canvas-soft text-on-pill"
            : "border border-border bg-surface text-foreground"
        )}
      >
        {!isUser ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-display font-bold text-xs text-foreground">Skim Wire</p>
            {message.provider ? (
              <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 font-mono text-xs text-secondary">
                {message.provider}
                {message.model ? ` · ${message.model}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap text-sm font-normal leading-relaxed text-foreground">
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
        {!isUser && message.sources ? (
          <SourceCitation
            sources={message.sources}
            retrievalMethod={message.retrieval_method}
          />
        ) : null}
      </div>
    </div>
  );
}
