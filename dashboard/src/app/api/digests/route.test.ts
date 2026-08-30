import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/digests/route";
import { sampleDigest } from "@/test/fixtures";

const requireActiveUser = vi.fn();
const fetchDigest = vi.fn();

vi.mock("@/lib/auth/require-active-user", () => ({
  requireActiveUser: () => requireActiveUser(),
}));

vi.mock("@/lib/digests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/digests")>(
    "@/lib/digests"
  );
  return {
    ...actual,
    fetchDigest: (...args: unknown[]) => fetchDigest(...args),
    todayUtc: () => "2026-08-30",
  };
});

describe("GET /api/digests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireActiveUser.mockResolvedValue({
      ok: true,
      ctx: { supabase: {} },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    requireActiveUser.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const response = await GET(
      new NextRequest("http://localhost/api/digests")
    );
    expect(response.status).toBe(401);
  });

  it("returns digest for requested date", async () => {
    fetchDigest.mockResolvedValue(sampleDigest);

    const response = await GET(
      new NextRequest("http://localhost/api/digests?date=2026-08-30")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.articles).toHaveLength(2);
    expect(fetchDigest).toHaveBeenCalledWith({}, "2026-08-30");
  });

  it("rejects invalid date format", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/digests?date=08-30-2026")
    );
    expect(response.status).toBe(400);
  });
});
