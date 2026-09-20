"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Compass, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { useCommandStore } from "@/store/command-store";
import { MAIN_NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useCommandStore((state) => state.open);
  const setOpen = useCommandStore((state) => state.setOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  if (!mounted) return null;

  function runCommand(command: () => void) {
    setOpen(false);
    command();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] sm:p-6"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <Command
        className="relative z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95"
        label="Global Command Menu"
      >
        <div className="flex items-center border-b border-border px-4">
          <Search size={18} className="text-secondary" />
          <Command.Input
            autoFocus
            placeholder="Search pages, actions, or type to search articles..."
            className="flex h-14 w-full rounded-none bg-transparent px-3 text-sm font-normal text-foreground outline-none placeholder:text-muted"
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm font-normal text-secondary">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary aria-selected:bg-surface-raised aria-selected:text-foreground"
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Separator className="my-2 h-px bg-border" />

          <Command.Group heading="Theme">
            <Command.Item
              value="Theme: Dark"
              onSelect={() => runCommand(() => setTheme("dark"))}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary aria-selected:bg-surface-raised aria-selected:text-foreground"
            >
              <Moon size={16} />
              <span>Dark Theme</span>
            </Command.Item>
            <Command.Item
              value="Theme: Light"
              onSelect={() => runCommand(() => setTheme("light"))}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary aria-selected:bg-surface-raised aria-selected:text-foreground"
            >
              <Sun size={16} />
              <span>Light Theme</span>
            </Command.Item>
          </Command.Group>

          <Command.Separator className="my-2 h-px bg-border" />

          <Command.Group heading="Actions">
            <Command.Item
              value="Sign out"
              onSelect={() => runCommand(() => router.push("/auth/signout"))}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-normal text-secondary aria-selected:bg-surface-raised aria-selected:text-foreground"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Command.Dialog>
  );
}
