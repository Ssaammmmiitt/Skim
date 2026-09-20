import { PageContainer } from "@/components/layout/PageContainer";
import { PipelineSteps } from "@/components/about/PipelineSteps";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

export const metadata = { title: "How it Works | Skim" };

export default function AboutPage() {
  return (
    <PageContainer size="md">
      <div className="relative rounded-3xl border border-surface-raised bg-surface px-6 py-12 sm:px-12 sm:py-20 lg:px-20">
        {/* Subtle grid background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--skim-hairline) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 text-center">
          <p className="text-xs font-normal uppercase tracking-wider text-muted">
            Under the hood
          </p>
          <h1 className="mt-4 text-3xl font-normal tracking-normal text-foreground sm:text-4xl md:text-5xl">
            AI-curated intelligence,
            <br />
            delivered daily.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base font-normal leading-relaxed text-secondary sm:text-lg">
            Skim isn&apos;t just an RSS reader. It&apos;s an autonomous pipeline that reads
            the news, evaluates importance, categorizes topics, and builds a
            searchable vector database every single night.
          </p>

          <PipelineSteps />

          <div className="mt-16 sm:mt-24">
            <h3 className="text-xl font-normal text-foreground">Tech Stack</h3>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                "Next.js 16",
                "React Server Components",
                "Supabase",
                "pgvector",
                "Tailwind CSS v4",
                "Zustand",
                "Framer Motion",
                "Python",
                "Gemini API",
                "Groq Llama 3",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border bg-surface-raised px-4 py-1.5 text-xs font-normal text-secondary shadow-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href="/"
              className={cn(ui.btnPrimary, "gap-2 px-6 py-3")}
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
