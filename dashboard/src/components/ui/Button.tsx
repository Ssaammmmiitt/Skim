import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "skim-btn-primary",
  secondary: "skim-btn-secondary",
  ghost: "skim-btn-ghost",
  danger: "skim-btn-danger",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type="button" className={cn(VARIANT_CLASS[variant], className)} {...props}>
      {children}
    </button>
  );
}
