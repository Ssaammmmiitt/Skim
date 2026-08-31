import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type ErrorAlertProps = {
  message: string;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <p className={cn(ui.errorBox, className)} role="alert">
      {message}
    </p>
  );
}
