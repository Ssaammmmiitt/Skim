import "@testing-library/jest-dom/vitest";
import "./src/app/globals.css";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";

// Handle happy-dom Animation abort errors during framer-motion cleanup in tests
if (typeof window !== "undefined" && window.Animation) {
  const origCancel = window.Animation.prototype.cancel;
  window.Animation.prototype.cancel = function () {
    try {
      origCancel.call(this);
      this.finished?.catch?.(() => {});
    } catch {
      // Ignore AbortError in happy-dom
    }
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));
