import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

const buttonVariants = cva(ui.btnPrimary, {
  variants: {
    variant: {
      default: "",
      secondary: ui.btnSecondary,
      ghost: ui.btnGhost,
      destructive: ui.btnDanger,
      link: "min-h-0 rounded-none border-0 bg-transparent p-0 text-cyan-bright underline-offset-4 hover:bg-transparent hover:text-cyan-glow hover:underline",
    },
    size: {
      default: "",
      sm: "min-h-9 px-3 py-2 text-[11px]",
      lg: "min-h-12 px-8 py-3 text-base",
      icon: "h-11 w-11 min-h-0 px-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
