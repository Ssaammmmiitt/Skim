"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SearchBar } from "@/components/ui/SearchBar";
import { useSearchStore } from "@/store/search-store";
import * as ui from "@/lib/tailwind-ui";

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const results = useSearchStore((state) => state.results);
  const loading = useSearchStore((state) => state.loading);
  const error = useSearchStore((state) => state.error);
  const fetchSearch = useSearchStore((state) => state.fetchSearch);

  useEffect(() => {
    void fetchSearch(query);
  }, [query, fetchSearch]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Search"
        title="Find articles"
        description="Hybrid semantic + keyword search across the full Skim corpus."
      />

      <SearchBar autoFocus={!query} />

      {!query ? (
        <EmptyState
          eyebrow="Start searching"
          title="Search the corpus"
          description="Try a topic, company name, or technology. Results combine semantic similarity with full-text matching."
        />
      ) : null}

      {query && loading ? <LoadingSpinner label="Searching…" /> : null}

      {error ? (
        <ErrorAlert
          message={error}
          onRetry={() => void fetchSearch(query)}
        />
      ) : null}

      {query && !loading && !error && results ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {results.results.length} result
            {results.results.length === 1 ? "" : "s"} for{" "}
            <span className="text-secondary">&ldquo;{query}&rdquo;</span>
            {results.mode ? (
              <span className="text-muted"> · {results.mode} retrieval</span>
            ) : null}
          </p>

          {results.results.length === 0 ? (
            <EmptyState
              eyebrow="No matches"
              title="Nothing found"
              description="Try different keywords or ask in Chat for a conversational answer."
              action={
                <Link href="/chat" className={ui.btnGhost}>
                  Open chat
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {results.results.map((article, index) => (
                <SearchResultCard
                  key={article.id}
                  article={article}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
