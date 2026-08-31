"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <PageContainer>
      <div className="skim-card mx-auto max-w-lg px-6 py-10 text-center">
        <p className="skim-eyebrow text-error">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-sm text-muted">
          {error.message || "An unknown error occurred while loading this page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="skim-btn-primary">
            Try again
          </button>
          <Link href="/" className="skim-btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
