import { cn } from "@/lib/cn";

type ErrorAlertProps = {
  message: string;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <p className={cn("skim-error", className)} role="alert">
      {message}
    </p>
  );
}
