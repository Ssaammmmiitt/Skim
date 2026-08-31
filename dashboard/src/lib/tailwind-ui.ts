/** Composed Tailwind class strings — use with `cn()` in components. */

export const eyebrow =
  "text-xs font-medium uppercase tracking-widest text-cyan-bright";

export const heading =
  "text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl";

export const subheading =
  "text-lg font-bold leading-snug text-foreground sm:text-xl";

export const body = "text-sm leading-relaxed text-secondary sm:text-base";

export const meta =
  "text-[11px] font-medium uppercase tracking-wider text-muted";

export const link =
  "text-xs font-semibold uppercase tracking-wider text-cyan-bright transition hover:text-cyan-glow";

export const card =
  "rounded-2xl border border-surface-raised bg-surface";

export const cardDashed =
  "rounded-2xl border border-dashed border-surface-raised bg-surface/50";

export const cardInteractive =
  "rounded-2xl border border-surface-raised bg-surface transition-colors hover:border-cyan-deep";

export const input =
  "min-h-11 w-full rounded-lg border border-surface-raised bg-canvas px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-cyan-core focus:ring-2 focus:ring-cyan-core/25 disabled:opacity-50";

export const inputNav =
  "w-full min-w-0 rounded-full border border-surface-raised bg-canvas/80 py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-cyan-core focus:ring-2 focus:ring-cyan-core/25";

export const textarea =
  "min-h-[44px] w-full resize-none rounded-xl border border-surface-raised bg-canvas px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-cyan-core focus:ring-2 focus:ring-cyan-core/25 disabled:opacity-50 sm:min-h-[52px] sm:px-4 sm:py-3";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-core px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-cyan-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-core focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-surface-raised px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-secondary transition hover:border-cyan-core hover:text-cyan-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-core/40 disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-core px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cyan-bright transition hover:bg-cyan-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-core/40";

export const btnDanger =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-error px-4 py-2 text-sm text-error transition hover:bg-error-surface/30";

export const pill =
  "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

export const navLink =
  "inline-flex min-h-10 shrink-0 items-center rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors sm:px-4";

export const navLinkActive =
  "bg-cyan-muted font-semibold text-cyan-glow";

export const navLinkInactive = "hover:bg-surface hover:text-cyan-bright";

export const navScroll =
  "flex items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const settingsBar =
  "fixed inset-x-0 bottom-0 z-40 border-t border-surface-raised bg-canvas/95 backdrop-blur-sm";

export const successText = "text-sm font-medium text-cyan-glow";

export const errorBox =
  "rounded-lg border border-error-surface bg-error-surface/30 px-4 py-3 text-sm text-error";
