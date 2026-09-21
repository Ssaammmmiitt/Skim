import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { renderDigestPreviewHtml } from "@/lib/email-preview";
import type { DigestFontStyle, DigestFormat, DigestSummaryStyle, DigestTheme } from "@/lib/auth/types";

const VALID_THEMES = new Set<DigestTheme>([
  "cyan", "classic", "minimal", "rose", "amber", "violet", "slate",
]);
const VALID_FORMATS = new Set<DigestFormat>(["full", "brief", "headlines"]);
const VALID_FONTS = new Set<DigestFontStyle>(["sans", "serif", "mono"]);
const VALID_SUMMARY_STYLES = new Set<DigestSummaryStyle>(["prose", "bullet_points", "card"]);

export async function GET(request: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;

  const themeParam = params.get("theme") ?? "cyan";
  const formatParam = params.get("format") ?? "full";
  const fontParam = params.get("font") ?? "sans";
  const summaryParam = params.get("summary_style") ?? "prose";

  const theme = VALID_THEMES.has(themeParam as DigestTheme)
    ? (themeParam as DigestTheme)
    : "cyan";
  const format = VALID_FORMATS.has(formatParam as DigestFormat)
    ? (formatParam as DigestFormat)
    : "full";
  const fontStyle = VALID_FONTS.has(fontParam as DigestFontStyle)
    ? (fontParam as DigestFontStyle)
    : "sans";
  const summaryStyle = VALID_SUMMARY_STYLES.has(summaryParam as DigestSummaryStyle)
    ? (summaryParam as DigestSummaryStyle)
    : "prose";

  const html = renderDigestPreviewHtml(theme, format, fontStyle, summaryStyle);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
