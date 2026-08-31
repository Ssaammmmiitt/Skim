export type NavItem = {
  href: string;
  label: string;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today" },
  { href: "/archive", label: "Archive" },
  { href: "/search", label: "Search" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
];

export const HIDDEN_NAV_PREFIXES = ["/login", "/pending", "/auth"];

export function shouldShowNav(pathname: string): boolean {
  return !HIDDEN_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
