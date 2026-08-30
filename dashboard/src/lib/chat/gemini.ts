import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.0-flash";

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RetrievedArticle = {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  summary: string | null;
  insight: string | null;
  topic: string | null;
};

function geminiApiKey(): string {
  const fromList = process.env.GEMINI_API_KEYS?.split(",")[0]?.trim();
  const single = process.env.GEMINI_API_KEY?.trim();
  const key = fromList || single;
  if (!key) {
    throw new Error("GEMINI_API_KEY or GEMINI_API_KEYS is not configured");
  }
  return key;
}

function buildContext(articles: RetrievedArticle[]): string {
  if (articles.length === 0) {
    return "No articles matched this question in the Skim corpus.";
  }

  return articles
    .map((article) => {
      const date = article.published_at
        ? new Date(article.published_at).toLocaleDateString("en-US")
        : "unknown date";
      const lines = [
        `[${article.title}] (${article.source}, ${date})`,
        `URL: ${article.url}`,
        article.summary ? `Summary: ${article.summary}` : null,
        article.insight ? `Insight: ${article.insight}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n---\n");
}

function buildPrompt(
  message: string,
  articles: RetrievedArticle[],
  history: ChatHistoryTurn[]
): string {
  const context = buildContext(articles);
  const historyBlock =
    history.length > 0
      ? `Previous conversation:\n${history
          .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
          .join("\n")}\n\n`
      : "";

  return `${historyBlock}Articles from the Skim news corpus:\n${context}\n\nUser question: ${message}`;
}

const SYSTEM_INSTRUCTION = `You are Skim, an AI assistant for a curated tech news digest.
Answer using only the provided articles. Cite article titles when you reference them.
If the articles do not contain relevant information, say you do not have enough coverage in the corpus.
Be concise, factual, and conversational. Do not invent stories or URLs.`;

export async function generateChatAnswer(
  message: string,
  articles: RetrievedArticle[],
  history: ChatHistoryTurn[] = []
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey() });
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const prompt = buildPrompt(message, articles, history.slice(-6));

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Empty response from language model");
  }
  return text;
}
