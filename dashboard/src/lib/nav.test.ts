import { describe, expect, it } from "vitest";
import { isNavActive, shouldShowNav } from "@/lib/nav";

describe("nav helpers", () => {
  it("hides nav on auth routes", () => {
    expect(shouldShowNav("/login")).toBe(false);
    expect(shouldShowNav("/pending")).toBe(false);
    expect(shouldShowNav("/auth/callback")).toBe(false);
    expect(shouldShowNav("/")).toBe(true);
    expect(shouldShowNav("/search")).toBe(true);
  });

  it("marks active routes", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/archive", "/")).toBe(false);
    expect(isNavActive("/archive", "/archive")).toBe(true);
    expect(isNavActive("/search", "/search")).toBe(true);
    expect(isNavActive("/chat", "/search")).toBe(false);
  });
});
