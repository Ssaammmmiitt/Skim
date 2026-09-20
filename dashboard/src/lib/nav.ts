import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Newspaper,
  Tag,
  Search,
  MessageSquare,
  Bookmark,
  Archive,
  Settings,
  User,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Only show in bottom tab bar on mobile */
  mobileOnly?: boolean;
  /** Hide from bottom tab bar (too many items) */
  desktopOnly?: boolean;
};

/** Full rail nav — desktop side rail + tablet top-strip */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/",          label: "Home",     description: "Dashboard overview",       icon: LayoutDashboard },
  { href: "/digest",    label: "Digest",   description: "Today's briefing",         icon: Newspaper },
  { href: "/topics",    label: "Topics",   description: "Browse by topic",          icon: Tag },
  { href: "/search",    label: "Search",   description: "Hybrid corpus search",     icon: Search },
  { href: "/chat",      label: "Chat",     description: "Ask questions with RAG",   icon: MessageSquare },
  { href: "/bookmarks", label: "Saved",    description: "Your bookmarked stories",  icon: Bookmark },
  { href: "/archive",   label: "Archive",  description: "Browse past digests",      icon: Archive, desktopOnly: true },
  { href: "/settings",  label: "Settings", description: "Themes and preferences",   icon: Settings, desktopOnly: true },
  { href: "/profile",   label: "Profile",  description: "Your reading stats",       icon: User,     desktopOnly: true },
];

/** 5 items shown in mobile bottom tab bar */
export const MOBILE_TAB_ITEMS: NavItem[] = MAIN_NAV_ITEMS.filter(
  (item) => !item.desktopOnly
).slice(0, 5);

export const HIDDEN_NAV_PREFIXES = ["/login", "/pending", "/auth"];

export function shouldShowNav(pathname: string): boolean {
  return !HIDDEN_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
