import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import type { RetrievedArticle } from "@/lib/retrieval";
import {
  ChatLlmError,
  isQuotaExhausted,
  isRetryableProviderStatus,
  parseProviderError,
} from "@/lib/chat/errors";
import {
  buildChatPrompt,
  CHAT_SYSTEM_INSTRUCTION,
  type ChatHistoryTurn,
} from "@/lib/chat/prompt";

export type ChatProviderName = "gemini" | "groq";

export type ChatAnswerResult = {
  answer: string;
  provider: ChatProviderName;
  model: string;
};

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const GEMINI_ROTATE_CODES = new Set([403, 404, 429]);
const SERVER_RETRY_CODES = new Set([500, 502, 503, 504]);
const MAX_SERVER_RETRIES = 2;

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function geminiKeys(): string[] {
  const keys = parseCsv(process.env.GEMINI_API_KEYS);
  if (keys.length > 0) return keys;
  const single = process.env.GEMINI_API_KEY?.trim();
  return single ? [single] : [];
}

function groqKeys(): string[] {
  const keys = parseCsv(process.env.GROQ_API_KEYS);
  if (keys.length > 0) return keys;
  const single = process.env.GROQ_API_KEY?.trim();
  return single ? [single] : [];
}

function fallbackGeminiModels(): string[] {
  const models = parseCsv(process.env.GEMINI_FALLBACK_MODELS);
  if (models.length > 0) return models;
  const single = process.env.GEMINI_FALLBACK_MODEL?.trim();
  if (single) return [single];
  return ["gemini-2.0-flash", "gemini-3.5-flash-lite"];
}

function primaryGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function groqModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

function geminiModelsToTry(): string[] {
  const primary = primaryGeminiModel();
  const fallbacks = fallbackGeminiModels().filter((m) => m !== primary);
  return [primary, ...fallbacks];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      temperature: 0.3,
      topP: 0.85,
      maxOutputTokens: 1024,
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new ChatLlmError({
      code: "empty_response",
      message: `Gemini ${model} returned empty content`,
      userMessage: "The AI returned an empty response. Please try again.",
      provider: "gemini",
      model,
      httpStatus: 502,
    });
  }
  return text;
}

async function callGroq(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const client = new Groq({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: CHAT_SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    top_p: 0.85,
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new ChatLlmError({
      code: "empty_response",
      message: `Groq ${model} returned empty content`,
      userMessage: "The AI returned an empty response. Please try again.",
      provider: "groq",
      model,
      httpStatus: 502,
    });
  }
  return text;
}

/**
 * Generate a RAG answer with multi-key Gemini rotation, model fallbacks, then Groq.
 */
export async function generateChatAnswer(
  message: string,
  articles: RetrievedArticle[],
  history: ChatHistoryTurn[] = []
): Promise<ChatAnswerResult> {
  const prompt = buildChatPrompt(message, articles, history.slice(-6));
  const tried: string[] = [];
  const geminiKeyList = geminiKeys();
  const groqKeyList = groqKeys();

  if (geminiKeyList.length === 0 && groqKeyList.length === 0) {
    throw new ChatLlmError({
      code: "config",
      message: "No GEMINI_API_KEYS or GROQ_API_KEYS configured",
      userMessage:
        "Chat is not configured on the server. Add GEMINI_API_KEYS and/or GROQ_API_KEYS.",
      httpStatus: 503,
    });
  }

  let lastQuotaError: ChatLlmError | null = null;
  let lastError: ChatLlmError | null = null;

  for (const model of geminiModelsToTry()) {
    for (const apiKey of geminiKeyList) {
      const label = `gemini:${model}`;
      let serverRetries = 0;

      while (serverRetries <= MAX_SERVER_RETRIES) {
        tried.push(label);
        try {
          const answer = await callGemini(apiKey, model, prompt);
          return { answer, provider: "gemini", model };
        } catch (err) {
          if (err instanceof ChatLlmError) {
            lastError = err;
            break;
          }

          const parsed = parseProviderError(err);
          const status = parsed.status;
          const llmError = new ChatLlmError({
            code: isQuotaExhausted(status, parsed.code, parsed.message)
              ? "quota_exhausted"
              : status === 429
                ? "rate_limited"
                : "unknown",
            message: parsed.message,
            userMessage: isQuotaExhausted(status, parsed.code, parsed.message)
              ? "Gemini free-tier quota reached for this model. Skim will try another provider or model."
              : "Gemini is temporarily unavailable. Skim is trying fallbacks.",
            provider: "gemini",
            model,
            retryAfterSeconds: parsed.retryAfterSeconds,
            tried: [...tried],
            httpStatus: status === 429 ? 429 : 503,
          });

          lastError = llmError;
          if (isQuotaExhausted(status, parsed.code, parsed.message)) {
            lastQuotaError = llmError;
          }

          if (GEMINI_ROTATE_CODES.has(status ?? 0)) {
            break;
          }

          if (SERVER_RETRY_CODES.has(status ?? 0) && serverRetries < MAX_SERVER_RETRIES) {
            serverRetries += 1;
            await sleep(1000 * serverRetries);
            continue;
          }

          if (!isRetryableProviderStatus(status, parsed.code)) {
            break;
          }
          break;
        }
      }
    }
  }

  for (const apiKey of groqKeyList) {
    const model = groqModel();
    const label = `groq:${model}`;
    tried.push(label);

    try {
      const answer = await callGroq(apiKey, model, prompt);
      return { answer, provider: "groq", model };
    } catch (err) {
      if (err instanceof ChatLlmError) {
        lastError = err;
        continue;
      }

      const parsed = parseProviderError(err);
      lastError = new ChatLlmError({
        code: isQuotaExhausted(parsed.status, parsed.code, parsed.message)
          ? "quota_exhausted"
          : parsed.status === 429
            ? "rate_limited"
            : "all_providers_failed",
        message: parsed.message,
        userMessage: "Groq fallback also failed. Please try again in a few minutes.",
        provider: "groq",
        model,
        retryAfterSeconds: parsed.retryAfterSeconds,
        tried: [...tried],
        httpStatus: parsed.status === 429 ? 429 : 503,
      });
    }
  }

  const final = lastQuotaError ?? lastError;
  if (final) {
    throw new ChatLlmError({
      code: "all_providers_failed",
      message: final.message,
      userMessage:
        "All AI providers are temporarily unavailable (Gemini quota / rate limits). " +
        "Skim tried multiple keys, models, and Groq. Please wait a minute and retry.",
      provider: final.provider,
      model: final.model,
      retryAfterSeconds: final.retryAfterSeconds,
      tried,
      httpStatus: final.httpStatus,
    });
  }

  throw new ChatLlmError({
    code: "all_providers_failed",
    message: "No providers available",
    userMessage: "Could not generate an answer. Please try again later.",
    tried,
    httpStatus: 503,
  });
}
