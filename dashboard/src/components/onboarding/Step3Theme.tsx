import { cn } from "@/lib/cn";
import { Check, Monitor, Sun, Moon } from "lucide-react";
import type { DashboardTheme } from "@/lib/auth/types";
import { useTheme } from "next-themes";

type Step3Props = {
  theme: DashboardTheme;
  onChange: (theme: DashboardTheme) => void;
};

export function Step3Theme({ theme, onChange }: Step3Props) {
  const { setTheme } = useTheme();

  const options: { id: DashboardTheme; label: string; icon: React.ElementType }[] = [
    { id: "dark", label: "Dark", icon: Moon },
    { id: "light", label: "Light", icon: Sun },
  ];

  function handleSelect(id: DashboardTheme) {
    onChange(id);
    setTheme(id); // Apply immediately for preview
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-normal tracking-normal text-foreground sm:text-4xl">
        Pick a theme
      </h2>
      <p className="mt-2 text-sm font-normal text-secondary">
        Choose how Skim looks on this device.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {options.map((opt) => {
          const isSelected = theme === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "group relative flex flex-col items-center gap-4 rounded-2xl border p-6 transition-all",
                isSelected
                  ? "border-foreground bg-surface-raised"
                  : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-raised/50"
              )}
            >
              <div className={cn("rounded-full p-3.5 border border-border", isSelected ? "bg-foreground text-canvas" : "bg-surface-raised text-secondary")}>
                <Icon size={22} />
              </div>
              <span className="text-sm font-normal text-foreground">
                {opt.label}
              </span>
              
              <div
                className={cn(
                  "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full transition-all",
                  isSelected
                    ? "border border-foreground bg-foreground text-canvas scale-100"
                    : "scale-0"
                )}
              >
                <Check size={12} strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
