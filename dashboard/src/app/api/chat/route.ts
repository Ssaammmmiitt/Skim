import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { generateChatAnswer } from "@/lib/chat/gemini";
import {
  CHAT_DAILY_LIMIT,
  checkChatRateLimit,
  getChatUsage,
  incrementChatUsage,
} from "@/lib/chat/rate-limit";
import { searchArticles } from "@/lib/search";
import type { ChatSource } from "@/lib/types";

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

const RETRIEVAL_LIMIT = 5;

export async function GET() {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const used = await getChatUsage(auth.ctx.user.id);
  return NextResponse.json({
    limit: CHAT_DAILY_LIMIT,
    used,
    remaining: Math.max(0, CHAT_DAILY_LIMIT - used),
  });
}

export async function POST(request: Request) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const rate = await checkChatRateLimit(auth.ctx.user.id);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Daily chat limit reached (${CHAT_DAILY_LIMIT} queries). Try again tomorrow.`,
        remaining: 0,
        used: rate.used,
      },
      { status: 429 }
    );
  }

  let body: { message?: string; history?: ChatHistoryItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const history = (body.history ?? []).filter(
    (turn): turn is ChatHistoryItem =>
      Boolean(turn?.content?.trim()) &&
      (turn.role === "user" || turn.role === "assistant")
  );

  try {
    const articles = await searchArticles(auth.ctx.supabase, message, {
      limit: RETRIEVAL_LIMIT,
      columns:
        "id, title, url, source, published_at, summary, insight, topic",
    });

    const answer = await generateChatAnswer(
      message,
      articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        source: article.source,
        published_at: article.published_at,
        summary: article.summary ?? null,
        insight: article.insight ?? null,
        topic: article.topic,
      })),
      history
    );
    await incrementChatUsage(auth.ctx.user.id);

    const used = rate.used + 1;
    const sources: ChatSource[] = articles.map((article) => ({
      id: article.id,
      title: article.title,
      url: article.url,
      source: article.source,
      published_at: article.published_at,
      topic: article.topic,
    }));

    return NextResponse.json({
      answer,
      sources,
      remaining: Math.max(0, CHAT_DAILY_LIMIT - used),
      used,
    });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Failed to generate answer";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
