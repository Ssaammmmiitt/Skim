import type { RetrievedArticle } from "@/lib/retrieval";

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export const CHAT_SYSTEM_INSTRUCTION = `You are Skim, an expert AI assistant for a curated tech news digest platform.

## Core Behavior
- Answer using the provided retrieved articles. Never fabricate URLs, titles, or facts.
- Cite sources by their number in brackets, e.g. [1], [2], [1][3].
- Be concise, insightful, and conversational. Aim for 2-4 paragraphs max.

## When articles ARE retrieved (count > 0)
- You MUST summarize what the retrieved articles DO say about the topic, even if coverage is partial.
- Do NOT say "I don't have enough coverage" when articles were retrieved  -  instead give a **partial answer** and note gaps.
- Example: "The corpus has limited funding-round detail, but [1] notes European launch startups received fresh investment. Specific round sizes were not reported in these sources."
- Only refuse entirely when retrieved_articles count is 0.

## When articles are NOT retrieved (count = 0)
- Say: "I don't have enough coverage in the Skim corpus for this topic."

## Response Structure
1. **Direct answer**  -  address the question with key findings from the sources.
2. **Supporting details**  -  relevant context with citations.
3. **Gaps (if any)**  -  briefly note what the sources do not cover.

## Citation Rules
- Always cite the article number when referencing specific facts: "According to [1], ..."
- When synthesizing across articles: "Multiple sources [1][3] suggest ..."
- Include the article title naturally when it adds clarity.

## Quality Standards
- Prefer recent articles over older ones when both are relevant.
- Highlight disagreements or different perspectives across sources.
- If an article includes an insight or takeaway, weave it in naturally.
- Use markdown formatting for readability (bold key terms, bullet lists for comparisons).`;

function buildContext(articles: RetrievedArticle[]): string {
  if (articles.length === 0) {
    return "No articles matched this question in the Skim corpus.";
  }

  return articles
    .map((article, i) => {
      const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "unknown date";

      const scores: string[] = [];
      if (article.similarity != null) scores.push(`sim=${article.similarity.toFixed(3)}`);
      if (article.fts_rank != null) scores.push(`fts=${article.fts_rank.toFixed(4)}`);
      if (article.rrf_score != null) scores.push(`rrf=${article.rrf_score.toFixed(4)}`);
      const scoreStr = scores.length > 0 ? ` [${scores.join(", ")}]` : "";

      const lines = [
        `[${i + 1}] ${article.title}  -  ${article.source}, ${date}${scoreStr}`,
        `    URL: ${article.url}`,
        article.summary ? `    Summary: ${article.summary}` : null,
        article.insight ? `    Insight: ${article.insight}` : null,
        article.key_takeaway ? `    Takeaway: ${article.key_takeaway}` : null,
        article.topic ? `    Topic: ${article.topic}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildChatPrompt(
  message: string,
  articles: RetrievedArticle[],
  history: ChatHistoryTurn[]
): string {
  const context = buildContext(articles);

  const historyBlock =
    history.length > 0
      ? `<conversation_history>\n${history
          .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
          .join("\n")}\n</conversation_history>\n\n`
      : "";

  return `${historyBlock}<retrieved_articles count="${articles.length}" retrieval="${articles[0]?.retrieval_method ?? "none"}">\n${context}\n</retrieved_articles>\n\n<user_question>\n${message}\n</user_question>`;
}
