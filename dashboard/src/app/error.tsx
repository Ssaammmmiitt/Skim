"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import * as ui from "@/lib/tailwind-ui";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function IconErrorCircle() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="text-error"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 14v12M24 32v2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <PageContainer>
      <div
        className={`${ui.card} mx-auto max-w-lg px-6 py-12 text-center sm:px-10 sm:py-16`}
        role="alert"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-error-surface bg-error-surface/20">
          <IconErrorCircle />
        </div>

        {/* Heading */}
        <p className={`${ui.eyebrow} text-error`}>Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          {error.message || "An unknown error occurred while loading this page."}
        </p>

        {/* Error digest ID for debugging */}
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">
            Error ID:{" "}
            <code className="rounded bg-surface-raised px-1.5 py-0.5 text-[11px] text-secondary">
              {error.digest}
            </code>
          </p>
        ) : null}

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={ui.btnPrimary}>
            Try again
          </button>
          <Link href="/" className={ui.btnGhost}>
            Back to home
          </Link>
        </div>

        {/* Report link */}
        <p className="mt-6 text-xs text-muted">
          If this keeps happening,{" "}
          <a
            href={`mailto:support@skim.example?subject=Error+Report&body=${encodeURIComponent(
              `Error: ${error.message}\nDigest: ${error.digest ?? "n/a"}`
            )}`}
            className="text-cyan-bright hover:text-cyan-glow hover:underline"
          >
            report this issue
          </a>
          .
        </p>
      </div>
    </PageContainer>
  );
}
