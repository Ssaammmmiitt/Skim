import type { DigestFontStyle, DigestFormat, DigestSummaryStyle, DigestTheme } from "@/lib/auth/types";
import {
  EMAIL_THEME_META,
  DIGEST_FONT_STYLES,
  DIGEST_SUMMARY_STYLES,
  SAMPLE_PREVIEW_STORY,
  formatFlags,
} from "@/lib/digest-preferences";

export function renderDigestPreviewHtml(
  theme: DigestTheme,
  format: DigestFormat,
  fontStyle: DigestFontStyle = "sans",
  summaryStyle: DigestSummaryStyle = "prose"
): string {
  const meta = EMAIL_THEME_META[theme];
  const flags = formatFlags(format);
  const story = SAMPLE_PREVIEW_STORY;
  const fontFamily = DIGEST_FONT_STYLES[fontStyle].fontFamily;
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build story body block based on summary style
  let summaryBlock = "";
  if (summaryStyle === "bullet_points" && flags.show_summaries) {
    summaryBlock = `
      <ul style="margin:0 0 8px;padding-left:18px;">
        <li style="margin:0 0 4px;font-size:14px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};">Reasoning improved 40% over previous model</li>
        <li style="margin:0 0 4px;font-size:14px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};">Enterprise pricing cut by 40% vs GPT-4</li>
        <li style="margin:0 0 4px;font-size:14px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};">Available via API starting today</li>
      </ul>`;
  } else if (summaryStyle === "card") {
    const cardBorder = meta.preview.pageBg.startsWith("#0") || meta.preview.pageBg.startsWith("#1")
      ? "rgba(255,255,255,0.08)"
      : "#e4e4e7";
    summaryBlock = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid ${cardBorder};border-radius:6px;overflow:hidden;width:100%;">
        ${flags.show_insights ? `<tr>
          <td style="padding:7px 10px;border-bottom:1px solid ${cardBorder};font-size:11px;color:${meta.preview.accent};font-weight:600;white-space:nowrap;width:1%;font-family:${fontFamily};">💡 Insight</td>
          <td style="padding:7px 10px;border-bottom:1px solid ${cardBorder};font-size:13px;color:${meta.preview.meta};font-family:${fontFamily};">${story.insight}</td>
        </tr>` : ""}
        ${flags.show_takeaways ? `<tr>
          <td style="padding:7px 10px;font-size:11px;color:${meta.preview.accent};font-weight:600;white-space:nowrap;width:1%;font-family:${fontFamily};">📌 Takeaway</td>
          <td style="padding:7px 10px;font-size:13px;color:${meta.preview.meta};font-family:${fontFamily};">${story.key_takeaway}</td>
        </tr>` : ""}
      </table>`;
  } else {
    // Prose (default)
    if (flags.show_insights) {
      summaryBlock = `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};">${story.insight}</p>`;
    } else if (flags.show_summaries) {
      summaryBlock = `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};">${story.summary}</p>`;
    }
  }

  const storyBlocks: string[] = [
    `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${meta.preview.accent};font-family:${fontFamily};">#${story.rank} · ${story.topic_label}</p>`,
    `<h2 style="margin:0 0 8px;font-size:18px;line-height:1.3;color:${meta.preview.text};font-family:${fontFamily};">${story.title}</h2>`,
  ];

  if (flags.show_takeaways && summaryStyle !== "card") {
    storyBlocks.push(
      `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${meta.preview.text};font-family:${fontFamily};">${story.key_takeaway}</p>`
    );
  }

  storyBlocks.push(summaryBlock);

  if (flags.show_read_more) {
    storyBlocks.push(
      `<a href="${story.url}" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${meta.preview.accent};text-decoration:none;font-family:${fontFamily};">Read more →</a>`
    );
  }

  const isDark = meta.preview.pageBg.startsWith("#0") || meta.preview.pageBg.startsWith("#1");
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e4e4e7";
  const rationaleBg = isDark ? "rgba(255,255,255,0.04)" : "#f4f4f5";

  const rationale = flags.show_rationale
    ? `<tr><td style="padding:14px 24px;background:${rationaleBg};border-bottom:1px solid ${borderColor};"><p style="margin:0;font-size:13px;line-height:1.5;color:${meta.preview.meta};font-family:${fontFamily};"><strong>Editor's note:</strong> Preview of your ${format} digest in ${DIGEST_SUMMARY_STYLES[summaryStyle].label} style.</p></td></tr>`
    : "";

  const footer = flags.show_stats_footer
    ? `<tr><td style="padding:16px 24px;background:${meta.preview.headerBg};"><p style="margin:0;font-size:12px;color:${meta.preview.meta};font-family:${fontFamily};">Topics: AI/ML (1) · Format: ${format} · Font: ${DIGEST_FONT_STYLES[fontStyle].label}</p></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Skim digest preview</title></head>
<body style="margin:0;padding:24px 12px;background:${meta.preview.pageBg};font-family:${fontFamily};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${meta.preview.cardBg};border-radius:20px;overflow:hidden;border:1px solid ${borderColor};">
<tr><td style="padding:24px;background:${meta.preview.headerBg};border-bottom:2px solid ${meta.preview.accent};">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${meta.preview.accent};font-family:${fontFamily};">Daily Tech Digest</p>
<h1 style="margin:0;font-size:24px;color:${meta.preview.text};font-family:${fontFamily};">Skim</h1>
<p style="margin:8px 0 0;font-size:14px;color:${meta.preview.meta};font-family:${fontFamily};">${date} · 1 story · ${meta.label}</p>
</td></tr>
${rationale}
<tr><td style="padding:20px 24px;border-bottom:1px solid ${borderColor};">
${storyBlocks.join("")}
</td></tr>
${footer}
</table></td></tr></table>
</body></html>`;
}
