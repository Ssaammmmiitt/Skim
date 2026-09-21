"use client";

import { Bookmark } from "lucide-react";
import { useBookmarkStore } from "@/store/bookmark-store";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/Toast";

type BookmarkButtonProps = {
  articleId: number;
};

export function BookmarkButton({ articleId }: BookmarkButtonProps) {
  const bookmarkedIds = useBookmarkStore((state) => state.bookmarkedIds);
  const initialized = useBookmarkStore((state) => state.initialized);
  const toggle = useBookmarkStore((state) => state.toggle);

  const isBookmarked = bookmarkedIds.has(articleId);

  async function handleToggle() {
    // Optimistic toggle
    await toggle(articleId);
    
    // Check state immediately after (if network failed, it will revert)
    const activeNow = useBookmarkStore.getState().bookmarkedIds.has(articleId);
    
    if (activeNow && !isBookmarked) {
       toast.success("Saved to bookmarks");
    } else if (!activeNow && isBookmarked) {
       toast.info("Removed from bookmarks");
    }
  }

  // Show a neutral loading state before bookmarks are hydrated for this user
  // to prevent incorrect filled/empty bookmark icon on first render
  if (!initialized) {
    return (
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface opacity-40"
        aria-label="Loading bookmark state"
      >
        <Bookmark size={14} className="text-secondary" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 active:scale-95",
        isBookmarked
          ? "border-foreground bg-foreground text-canvas"
          : "border-hairline bg-surface text-secondary hover:border-foreground/40 hover:bg-surface-raised hover:text-foreground"
      )}
      aria-label={isBookmarked ? "Remove bookmark" : "Save bookmark"}
    >
      <Bookmark
        size={14}
        className={cn("transition-transform group-hover:scale-105", isBookmarked && "fill-current")}
      />
    </button>
  );
}
