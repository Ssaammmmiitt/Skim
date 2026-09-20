import { Database, Search, Bot, Mail } from "lucide-react";

export function PipelineSteps() {
  const steps = [
    {
      title: "Data Ingestion",
      desc: "Every night at 00:15 UTC, the pipeline scrapes top stories from Hacker News, TechCrunch, Ars Technica, The Verge, and MIT Tech Review.",
      icon: Database,
    },
    {
      title: "Embedding & Processing",
      desc: "Raw text is cleaned, summarized, and embedded into 384-dimensional vectors using pgvector. Stories are scored for importance.",
      icon: Search,
    },
    {
      title: "RAG & Chat",
      desc: "When you ask a question, hybrid search retrieves the exact context. Gemini generates an accurate, hallucination-free response.",
      icon: Bot,
    },
    {
      title: "Delivery",
      desc: "The final curated list of the most important stories is formatted into your preferred theme and delivered directly to your inbox.",
      icon: Mail,
    },
  ];

  return (
    <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Decorative dashed line for large screens connecting the steps */}
      <div className="absolute left-1/2 top-10 hidden h-0.5 w-[75%] -translate-x-1/2 border-t border-dashed border-border lg:block" />

      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div
            key={i}
            className="relative flex flex-col items-center text-center"
          >
            <div className="relative mb-5 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-surface shadow-sm">
              <Icon size={28} className="text-foreground" />
              {/* Step number badge */}
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-foreground text-xs font-mono font-medium text-canvas shadow-sm">
                {i + 1}
              </div>
            </div>
            <h3 className="mb-2 text-lg font-normal text-foreground">{step.title}</h3>
            <p className="text-sm font-normal leading-relaxed text-secondary">{step.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
