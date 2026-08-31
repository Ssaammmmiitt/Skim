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
        <strong key={i} className="font-semibold text-subtle">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[\d[\d,\s]*\]$/.test(part)) {
      return (
        <span key={i} className="text-[10px] font-medium text-cyan-bright">
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
          "max-w-[85%] rounded-card px-4 py-3",
          isUser
            ? "bg-cyan-core text-black"
            : cn(ui.card, "text-foreground")
        )}
      >
        {!isUser ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className={cn(ui.meta, "text-cyan-bright")}>Skim</p>
            {message.provider ? (
              <span className="rounded-pill border border-surface-raised bg-canvas px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {message.provider}
                {message.model ? ` · ${message.model}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
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
