"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Step = "email" | "verify-otp";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Google sign-in failed. Check Supabase redirect URLs and try again.",
  session: "Your session could not be established. Please sign in again.",
  profile: "Could not load your profile. Run sql/002_users_auth_preferences.sql in Supabase, then try again.",
};

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
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4">
      <div className="w-full max-w-md rounded-[20px] border border-[#243044] bg-[#1a2332] p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#22d3ee]">
          Skim
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#f0f9ff]">
          {mode === "signup" ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-[#94a3b8]">
          {mode === "signup"
            ? "Register with email OTP or Google. New accounts need admin approval."
            : "Sign in with Google or a login code. Approved accounts only."}
        </p>

        <div className="mt-6 flex rounded-full border border-[#243044] p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${
              mode === "signin"
                ? "bg-[#06b6d4] text-black"
                : "text-[#94a3b8]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-full py-2 text-sm font-medium ${
              mode === "signup"
                ? "bg-[#06b6d4] text-black"
                : "text-[#94a3b8]"
            }`}
          >
            Sign up
          </button>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#06b6d4] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#22d3ee]"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-[#64748b]">
          <span className="h-px flex-1 bg-[#243044]" />
          or email
          <span className="h-px flex-1 bg-[#243044]" />
        </div>

        {step === "verify-otp" ? (
          <form onSubmit={verifyOtp} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-lg border border-[#243044] bg-[#0f1419] px-4 py-3 text-[#f0f9ff] outline-none focus:border-[#06b6d4]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#06b6d4] px-6 py-3 text-sm font-semibold text-black hover:bg-[#22d3ee]"
            >
              Verify code
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-[#94a3b8] hover:text-[#22d3ee]"
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
              className="w-full rounded-lg border border-[#243044] bg-[#0f1419] px-4 py-3 text-[#f0f9ff] outline-none focus:border-[#06b6d4]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full border border-[#06b6d4] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-[#22d3ee] hover:bg-[#164e63]"
            >
              {mode === "signup" ? "Send registration code" : "Send login code"}
            </button>
          </form>
        )}

        {message ? (
          <p className="mt-4 text-sm text-[#67e8f9]">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
