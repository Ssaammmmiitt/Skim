export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", description: "Today's digest briefing" },
  { href: "/archive", label: "Archive", description: "Browse past digests" },
  { href: "/search", label: "Search", description: "Hybrid corpus search" },
  { href: "/chat", label: "Chat", description: "Ask questions with RAG" },
  { href: "/settings", label: "Settings", description: "Themes and preferences" },
];

export const HIDDEN_NAV_PREFIXES = ["/login", "/pending", "/auth"];

export function shouldShowNav(pathname: string): boolean {
  return !HIDDEN_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
