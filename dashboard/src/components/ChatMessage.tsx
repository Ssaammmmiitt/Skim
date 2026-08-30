import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { SourceCitation } from "@/components/SourceCitation";

type ChatMessageProps = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-[20px] px-4 py-3 ${
          isUser
            ? "bg-[#06b6d4] text-black"
            : "border border-[#243044] bg-[#1a2332] text-[#f0f9ff]"
        }`}
      >
        {!isUser ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#22d3ee]">
            Skim
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {!isUser && message.sources ? (
          <SourceCitation sources={message.sources} />
        ) : null}
      </div>
    </div>
  );
}
