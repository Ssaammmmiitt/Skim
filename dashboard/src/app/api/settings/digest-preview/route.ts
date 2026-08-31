import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { renderDigestPreviewHtml } from "@/lib/email-preview";
import type { DigestFormat, DigestTheme } from "@/lib/auth/types";

const THEMES = new Set<DigestTheme>(["cyan", "classic", "minimal"]);
const FORMATS = new Set<DigestFormat>(["full", "brief", "headlines"]);

export async function GET(request: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const themeParam = request.nextUrl.searchParams.get("theme") ?? "cyan";
  const formatParam = request.nextUrl.searchParams.get("format") ?? "full";

  const theme = THEMES.has(themeParam as DigestTheme)
    ? (themeParam as DigestTheme)
    : "cyan";
  const format = FORMATS.has(formatParam as DigestFormat)
    ? (formatParam as DigestFormat)
    : "full";

  const html = renderDigestPreviewHtml(theme, format);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
