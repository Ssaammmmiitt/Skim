"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";
type Step = "email" | "verify-otp";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Google sign-in failed. Check Supabase redirect URLs and try again.",
  session: "Your session could not be established. Please sign in again.",
  profile:
    "Could not load your profile. Run sql/002_users_auth_preferences.sql in Supabase, then try again.",
};

function modeTabClass(active: boolean) {
  return cn(
    "flex-1 rounded-pill-lg py-2 text-base font-semibold transition",
    active ? "bg-primary text-on-primary" : "text-body"
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error && ERROR_MESSAGES[error]) {
      setMessage(ERROR_MESSAGES[error]);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace("/auth/complete");
      }
    });
  }, [supabase.auth]);

  async function signInWithGoogle() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  }

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: mode === "signup",
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setStep("verify-otp");
    setMessage(
      mode === "signup"
        ? "Enter the 6-digit code we sent to verify your new account."
        : "Enter the 6-digit login code from your email."
    );
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.href = "/auth/complete";
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep("email");
    setOtp("");
    setMessage("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="skim-hero-band">
        <p className="skim-eyebrow text-on-primary">Welcome</p>
        <h1 className="skim-heading mt-3 text-on-dark">
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8">
      <div className="skim-card w-full max-w-md border border-surface-raised p-8">
        <p className="mt-2 skim-body">
          {mode === "signup"
            ? "Register with email OTP or Google. New accounts need admin approval."
            : "Sign in with Google or a login code. Approved accounts only."}
        </p>

        <div className="mt-6 flex rounded-pill border border-surface-raised p-1">
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
          className="skim-btn-primary mt-6 flex w-full items-center justify-center gap-2 px-6 py-3 text-sm"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
          <span className="skim-divider" />
          or email
          <span className="skim-divider" />
        </div>

        {step === "verify-otp" ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="skim-input"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="skim-btn-primary w-full px-6 py-3 text-sm"
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
              className="skim-input"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="skim-btn-ghost w-full px-6 py-3 text-sm"
            >
              {mode === "signup" ? "Send registration code" : "Send login code"}
            </button>
          </form>
        )}

        {message ? <p className="mt-4 skim-success">{message}</p> : null}
      </div>
      </div>
    </div>
  );
}
