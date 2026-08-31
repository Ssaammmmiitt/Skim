import { describe, expect, it } from "vitest";
import { renderDigestPreviewHtml } from "@/lib/email-preview";

describe("renderDigestPreviewHtml", () => {
  it("renders all digest themes", () => {
    for (const theme of ["cyan", "classic", "minimal"] as const) {
      const html = renderDigestPreviewHtml(theme, "full");
      expect(html).toContain("Skim");
      expect(html).toContain("OpenAI ships");
    }
  });

  it("omits body fields for headlines format", () => {
    const html = renderDigestPreviewHtml("classic", "headlines");
    expect(html).not.toContain("Read more");
    expect(html).not.toContain("Editor's note");
  });
});
