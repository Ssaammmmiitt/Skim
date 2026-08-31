"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type SearchBarProps = {
  variant?: "nav" | "page";
  autoFocus?: boolean;
  className?: string;
};

export function SearchBar({
  variant = "page",
  autoFocus = false,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full", className)}
      role="search"
    >
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden
      >
        ⌕
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the corpus…"
        autoFocus={autoFocus}
        className={cn(
          variant === "nav" ? ui.inputNav : ui.input,
          variant === "page" && "pl-11"
        )}
        aria-label="Search articles"
      />
    </form>
  );
}
