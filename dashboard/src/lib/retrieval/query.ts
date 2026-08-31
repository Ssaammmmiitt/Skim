export type HistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Build retrieval queries from a conversational message.
 * Vector search gets richer context; FTS gets a focused keyword query.
 */
export function buildRetrievalQueries(
  message: string,
  history: HistoryTurn[] = []
): { vectorQuery: string; ftsQuery: string } {
  const trimmed = message.trim();
  const recentUserTurns = history
    .filter((turn) => turn.role === "user")
    .slice(-2)
    .map((turn) => turn.content.trim())
    .filter(Boolean);

  const contextParts = [...new Set([...recentUserTurns, trimmed])];
  const vectorQuery = contextParts.join(" ").slice(0, 512);

  // FTS: prefer the latest question; strip filler for short follow-ups
  let ftsQuery = trimmed;
  if (trimmed.split(/\s+/).length <= 4 && recentUserTurns.length > 0) {
    ftsQuery = `${recentUserTurns[recentUserTurns.length - 1]} ${trimmed}`;
  }

  return { vectorQuery, ftsQuery: ftsQuery.slice(0, 256) };
}
