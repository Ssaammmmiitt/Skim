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

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 active:scale-95",
        isBookmarked
          ? "border-border-on-dark bg-on-canvas-soft text-on-pill"
          : "border-surface-raised bg-surface text-secondary hover:border-hairline hover:text-on-canvas"
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
