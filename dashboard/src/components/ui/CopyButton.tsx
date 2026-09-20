"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "./Toast";

type CopyButtonProps = {
  textToCopy: string;
  label?: string;
  className?: string;
  iconSize?: number;
};

export function CopyButton({ textToCopy, label, className, iconSize = 16 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors font-normal text-secondary hover:text-foreground",
        copied ? "text-foreground" : className
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {label && <span className="text-sm font-normal">{label}</span>}
    </button>
  );
}
