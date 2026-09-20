import { create } from "zustand";

type BookmarkStore = {
  bookmarkedIds: Set<number>;
  setInitial: (ids: number[]) => void;
  toggle: (articleId: number) => Promise<void>;
};

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarkedIds: new Set(),
  
  setInitial: (ids: number[]) => set({ bookmarkedIds: new Set(ids) }),

  toggle: async (articleId: number) => {
    const { bookmarkedIds } = get();
    const isBookmarked = bookmarkedIds.has(articleId);

    // Optimistic update
    const newSet = new Set(bookmarkedIds);
    if (isBookmarked) {
      newSet.delete(articleId);
    } else {
      newSet.add(articleId);
    }
    set({ bookmarkedIds: newSet });

    try {
      const res = await fetch("/api/bookmarks", {
        method: isBookmarked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      });

      if (!res.ok) {
        // Revert on error
        set({ bookmarkedIds });
      }
    } catch {
      // Revert on network error
      set({ bookmarkedIds });
    }
  },
}));
