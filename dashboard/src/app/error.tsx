"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import * as ui from "@/lib/tailwind-ui";

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
      <div className={`${ui.card} mx-auto max-w-lg px-6 py-10 text-center`}>
        <p className={`${ui.eyebrow} text-error`}>Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-sm text-muted">
          {error.message || "An unknown error occurred while loading this page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={ui.btnPrimary}>
            Try again
          </button>
          <Link href="/" className={ui.btnGhost}>
            Back to home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
