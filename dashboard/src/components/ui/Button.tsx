import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill-lg text-lg font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-cyan-bright",
        secondary:
          "border border-ink bg-canvas text-ink hover:border-primary hover:text-primary",
        ghost:
          "border border-primary bg-canvas text-primary hover:bg-cyan-muted",
        destructive:
          "border border-destructive text-destructive hover:bg-error-surface/30",
        link: "text-primary underline-offset-4 hover:text-cyan-bright hover:underline",
      },
      size: {
        default: "min-h-[52px] px-6 py-3",
        sm: "min-h-9 rounded-md px-3 text-[11px]",
        lg: "min-h-12 px-8 py-3",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

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
