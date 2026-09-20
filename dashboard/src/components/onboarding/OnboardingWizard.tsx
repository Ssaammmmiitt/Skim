"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Step1Topics } from "./Step1Topics";
import { Step2Format } from "./Step2Format";
import { Step3Theme } from "./Step3Theme";
import type { DashboardTheme, DigestFormat } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import { ArrowRight, Loader2 } from "lucide-react";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // State
  const [topics, setTopics] = useState<string[]>([]);
  const [format, setFormat] = useState<DigestFormat>("full");
  const [theme, setTheme] = useState<DashboardTheme>("dark");

  async function handleFinish() {
    setSaving(true);
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics, format, theme }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setSaving(false);
      // fallback error handling could go here
    }
  }

  const canProceed = step === 1 ? topics.length > 0 : true;

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Progress bar with step labels */}
      <div className="mb-10">
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= step ? "bg-foreground" : "bg-surface-raised"
              )}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-xs font-normal text-muted">
          <span className={step >= 1 ? "text-foreground" : ""}>1. Topic Feeds</span>
          <span className={step >= 2 ? "text-foreground" : ""}>2. Reading Format</span>
          <span className={step >= 3 ? "text-foreground" : ""}>3. Theme & Finish</span>
        </div>
      </div>

      <div className="min-h-[400px]">
        {step === 1 && <Step1Topics selected={topics} onChange={setTopics} />}
        {step === 2 && <Step2Format format={format} onChange={setFormat} />}
        {step === 3 && <Step3Theme theme={theme} onChange={setTheme} />}
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={saving}
            className="rounded-full border border-transparent px-5 py-2.5 text-sm font-normal text-secondary hover:text-foreground"
          >
            Back
          </button>
        ) : (
          <div /> // Spacer
        )}

        <button
          type="button"
          onClick={() => (step === 3 ? handleFinish() : setStep(step + 1))}
          disabled={!canProceed || saving}
          className={cn(ui.btnPrimary, "gap-2 px-6")}
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : step === 3 ? (
            "Complete setup"
          ) : (
            <>
              Next <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
