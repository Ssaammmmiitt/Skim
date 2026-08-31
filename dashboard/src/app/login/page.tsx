"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type Mode = "signin" | "signup";
type Step = "email" | "verify-otp";
type Feedback = { text: string; kind: "error" | "info" };

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Google sign-in failed. Check Supabase redirect URLs and try again.",
  session: "Your session could not be established. Please sign in again.",
  profile:
    "Could not load your profile. Run sql/002_users_auth_preferences.sql in Supabase, then try again.",
};

function readUrlErrorMessage(): string {
  if (typeof window === "undefined") return "";
  const error = new URLSearchParams(window.location.search).get("error");
  return error && ERROR_MESSAGES[error] ? ERROR_MESSAGES[error] : "";
}

function modeTabClass(active: boolean) {
  return cn(
    "flex-1 rounded-full py-2 text-sm font-medium transition",
    active ? "bg-cyan-core text-black" : "text-secondary"
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [urlErrorMessage] = useState(readUrlErrorMessage);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);

  const displayFeedback =
    feedback ??
    (urlErrorMessage ? { text: urlErrorMessage, kind: "error" as const } : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/auth/complete");
      }
    });
  }, [router, supabase.auth]);

  async function signInWithGoogle() {
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) setFeedback({ text: error.message, kind: "error" });
    setLoading(false);
  }

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: mode === "signup" },
    });
    setLoading(false);
    if (error) {
      setFeedback({ text: error.message, kind: "error" });
      return;
    }
    setStep("verify-otp");
    setFeedback({
      text:
        mode === "signup"
          ? "Enter the 6-digit code we sent to verify your new account."
          : "Enter the 6-digit login code from your email.",
      kind: "info",
    });
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setFeedback({ text: error.message, kind: "error" });
      return;
    }
    router.push("/auth/complete");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep("email");
    setOtp("");
    setFeedback(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="border-b border-surface-raised bg-surface px-4 py-10 sm:px-8">
        <p className={ui.eyebrow}>Skim</p>
        <h1 className={cn(ui.heading, "mt-2")}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div className={cn(ui.card, "w-full max-w-md p-6 sm:p-8")}>
          <p className={ui.body}>
            {mode === "signup"
              ? "Register with email OTP or Google. New accounts need admin approval."
              : "Sign in with Google or a login code. Approved accounts only."}
          </p>

          <div className="mt-6 flex rounded-full border border-surface-raised p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={modeTabClass(mode === "signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={modeTabClass(mode === "signup")}
            >
              Sign up
            </button>
          </div>

          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={loading}
            className={cn(ui.btnPrimary, "mt-6 w-full")}
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-surface-raised" />
            or email
            <span className="h-px flex-1 bg-surface-raised" />
          </div>

          {step === "verify-otp" ? (
            <form onSubmit={verifyOtp} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={ui.input}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className={cn(ui.btnPrimary, "w-full")}
              >
                Verify code
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-sm text-secondary hover:text-cyan-bright"
              >
                Use a different email
              </button>
            </form>
          ) : (
            <form onSubmit={sendOtp} className="space-y-4">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={ui.input}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className={cn(ui.btnGhost, "w-full")}
              >
                {mode === "signup"
                  ? "Send registration code"
                  : "Send login code"}
              </button>
            </form>
          )}

          {displayFeedback ? (
            displayFeedback.kind === "error" ? (
              <p className={cn(ui.errorBox, "mt-4")} role="alert">
                {displayFeedback.text}
              </p>
            ) : (
              <p className={cn(ui.successText, "mt-4")}>{displayFeedback.text}</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
