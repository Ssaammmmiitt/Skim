export type ChatErrorCode =
  | "quota_exhausted"
  | "rate_limited"
  | "all_providers_failed"
  | "config"
  | "empty_response"
  | "unknown";

export type ChatProviderName = "gemini" | "groq";

export class ChatLlmError extends Error {
  readonly code: ChatErrorCode;
  readonly provider?: ChatProviderName;
  readonly model?: string;
  readonly retryAfterSeconds?: number;
  readonly tried: string[];
  readonly userMessage: string;
  readonly httpStatus: number;

  constructor(options: {
    code: ChatErrorCode;
    message: string;
    userMessage: string;
    provider?: ChatProviderName;
    model?: string;
    retryAfterSeconds?: number;
    tried?: string[];
    httpStatus?: number;
  }) {
    super(options.message);
    this.name = "ChatLlmError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.provider = options.provider;
    this.model = options.model;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.tried = options.tried ?? [];
    this.httpStatus = options.httpStatus ?? 503;
  }

  toJson() {
    return {
      error: this.userMessage,
      error_code: this.code,
      provider: this.provider,
      model: this.model,
      retry_after_seconds: this.retryAfterSeconds,
      tried_providers: this.tried,
      details: this.message,
    };
  }
}

type ParsedApiError = {
  status?: number;
  code?: string;
  message: string;
  retryAfterSeconds?: number;
};

function extractRetrySeconds(text: string): number | undefined {
  const match = text.match(/retry in ([\d.]+)s/i);
  if (!match) return undefined;
  const value = Math.ceil(parseFloat(match[1]));
  return Number.isFinite(value) ? value : undefined;
}

export function parseProviderError(err: unknown): ParsedApiError {
  const raw = err instanceof Error ? err.message : String(err);
  const retryAfterSeconds = extractRetrySeconds(raw);

  const statusFromObj =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status?: unknown }).status)
      : undefined;

  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; message?: string; status?: string };
    };
    if (parsed.error) {
      return {
        status: parsed.error.code ?? statusFromObj,
        code: parsed.error.status,
        message: parsed.error.message ?? raw,
        retryAfterSeconds,
      };
    }
  } catch {
    // not JSON — continue
  }

  const embedded = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (embedded) {
    try {
      const parsed = JSON.parse(embedded[0]) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed.error) {
        return {
          status: parsed.error.code ?? statusFromObj,
          code: parsed.error.status,
          message: parsed.error.message ?? raw,
          retryAfterSeconds,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    status: statusFromObj,
    message: raw,
    retryAfterSeconds,
  };
}

export function isRetryableProviderStatus(status?: number, code?: string): boolean {
  if (status === 429 || code === "RESOURCE_EXHAUSTED") return true;
  if (status === 403 || status === 404) return true;
  if (status != null && status >= 500) return true;
  return false;
}

export function isQuotaExhausted(status?: number, code?: string, message?: string): boolean {
  if (status === 429 || code === "RESOURCE_EXHAUSTED") return true;
  const lower = (message ?? "").toLowerCase();
  return lower.includes("quota") || lower.includes("exceeded your current quota");
}
