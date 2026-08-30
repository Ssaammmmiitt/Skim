import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_DAILY_LIMIT,
  checkChatRateLimit,
  getChatUsage,
  incrementChatUsage,
} from "@/lib/chat/rate-limit";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

function chain() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.insert.mockResolvedValue({ error: null });
  builder.update.mockReturnValue(builder);
  mockFrom.mockReturnValue(builder);
  return builder;
}

describe("chat rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chain();
  });

  it("reports zero usage when no row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getChatUsage("user-1")).resolves.toBe(0);
  });

  it("allows requests under the daily limit", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { query_count: 5 }, error: null });
    const result = await checkChatRateLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(CHAT_DAILY_LIMIT - 5);
  });

  it("blocks requests at the daily limit", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { query_count: CHAT_DAILY_LIMIT },
      error: null,
    });
    const result = await checkChatRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("inserts first usage row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await incrementChatUsage("user-1");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", query_count: 1 })
    );
  });

  it("increments existing usage row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { query_count: 3 }, error: null });
    await incrementChatUsage("user-1");
    const updateBuilder = mockFrom.mock.results.at(-1)?.value as ReturnType<
      typeof chain
    >;
    expect(updateBuilder.update).toHaveBeenCalledWith({ query_count: 4 });
  });
});
