import type { DigestFormat, DigestTheme } from "@/lib/auth/types";
import {
  EMAIL_THEME_META,
  SAMPLE_PREVIEW_STORY,
  formatFlags,
} from "@/lib/digest-preferences";

export function renderDigestPreviewHtml(
  theme: DigestTheme,
  format: DigestFormat
): string {
  const meta = EMAIL_THEME_META[theme];
  const flags = formatFlags(format);
  const story = SAMPLE_PREVIEW_STORY;
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const storyBlocks: string[] = [
    `<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${meta.preview.accent};">#${story.rank} · ${story.topic_label}</p>`,
    `<h2 style="margin:0 0 8px;font-size:18px;line-height:1.3;color:${meta.preview.text};">${story.title}</h2>`,
  ];

  if (flags.show_takeaways) {
    storyBlocks.push(
      `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${meta.preview.text};">${story.key_takeaway}</p>`
    );
  }
  if (flags.show_insights) {
    storyBlocks.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${meta.preview.meta};">${story.insight}</p>`
    );
  }
  if (flags.show_summaries) {
    storyBlocks.push(
      `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${meta.preview.meta};">${story.summary}</p>`
    );
  }
  if (flags.show_read_more) {
    storyBlocks.push(
      `<a href="${story.url}" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${meta.preview.accent};text-decoration:none;">Read more →</a>`
    );
  }

  const rationale = flags.show_rationale
    ? `<tr><td style="padding:14px 24px;background:${theme === "cyan" ? "#164e63" : "#f4f4f5"};border-bottom:1px solid ${theme === "cyan" ? "#243044" : "#e4e4e7"};"><p style="margin:0;font-size:13px;line-height:1.5;color:${meta.preview.meta};"><strong>Editor's note:</strong> Preview of your ${format} digest format.</p></td></tr>`
    : "";

  const footer = flags.show_stats_footer
    ? `<tr><td style="padding:16px 24px;background:${meta.preview.headerBg};"><p style="margin:0;font-size:12px;color:${meta.preview.meta};">Topics: AI/ML (1) · Format: ${format}</p></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Skim digest preview</title></head>
<body style="margin:0;padding:24px 12px;background:${meta.preview.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${meta.preview.cardBg};border-radius:20px;overflow:hidden;border:1px solid ${theme === "cyan" ? "#243044" : "#e4e4e7"};">
<tr><td style="padding:24px;background:${meta.preview.headerBg};border-bottom:2px solid ${meta.preview.accent};">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${meta.preview.accent};">Daily Tech Digest</p>
<h1 style="margin:0;font-size:24px;color:${meta.preview.text};">Skim</h1>
<p style="margin:8px 0 0;font-size:14px;color:${meta.preview.meta};">${date} · 1 story · ${meta.label}</p>
</td></tr>
${rationale}
<tr><td style="padding:20px 24px;border-bottom:1px solid ${theme === "cyan" ? "#243044" : "#e4e4e7"};">
${storyBlocks.join("")}
</td></tr>
${footer}
</table></td></tr></table>
</body></html>`;
}
