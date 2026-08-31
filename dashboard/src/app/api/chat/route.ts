import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { ChatLlmError } from "@/lib/chat/errors";
import { generateChatAnswer } from "@/lib/chat/llm-client";
import {
  CHAT_DAILY_LIMIT,
  checkChatRateLimit,
  getChatUsage,
  incrementChatUsage,
} from "@/lib/chat/rate-limit";
import { hybridRetrieve } from "@/lib/retrieval";
import type { ChatSource } from "@/lib/types";

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

const RETRIEVAL_LIMIT = 8;

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
    const articles = await hybridRetrieve(auth.ctx.supabase, message, {
      limit: RETRIEVAL_LIMIT,
      history,
    });

    const { answer, provider, model } = await generateChatAnswer(
      message,
      articles,
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
      similarity: article.similarity,
      rrf_score: article.rrf_score,
      retrieval_method: article.retrieval_method,
    }));

    return NextResponse.json({
      answer,
      sources,
      remaining: Math.max(0, CHAT_DAILY_LIMIT - used),
      used,
      retrieval_method: articles[0]?.retrieval_method ?? "none",
      provider,
      model,
      articles_retrieved: articles.length,
    });
  } catch (error) {
    if (error instanceof ChatLlmError) {
      return NextResponse.json(error.toJson(), { status: error.httpStatus });
    }
    const errMessage =
      error instanceof Error ? error.message : "Failed to generate answer";
    return NextResponse.json(
      {
        error: "Something went wrong while generating an answer.",
        error_code: "unknown",
        details: errMessage,
      },
      { status: 500 }
    );
  }
}
