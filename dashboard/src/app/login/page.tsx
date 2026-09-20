"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Zap,
  Search,
  MessageSquare,
  Inbox,
  ArrowRight,
  MailCheck,
  Check,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";
import { BrandMark } from "@/components/layout/BrandMark";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Mode = "signin" | "signup";
type Method = "password" | "otp";
type Step = "input" | "verify-otp" | "verify-email-link";
type Feedback = { text: string; kind: "error" | "info" };

/* ─── Error messages ─────────────────────────────────────────────────────── */

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

/* ─── Static preview data (realistic Skim digest summaries) ──────────────── */

const PREVIEW_STORIES = [
  {
    rank: 1,
    topic: "Systems",
    source: "LWN.net",
    time: "2h ago",
    title: "Linux 6.14 merges memory tiering improvements for pooled CXL devices",
    takeaway:
      "Kernel page migration between local DRAM and pooled CXL memory now executes without thread lock contention.",
    insight:
      "The patch series introduces asynchronous memory promotion via opportunistic NUMA balancing. Benchmarks on 512GB tiered nodes show a 28% drop in p99 page-fault latency under memory-intensive analytical query workloads.",
    score: 9.6,
  },
  {
    rank: 2,
    topic: "Databases",
    source: "Hacker News",
    time: "4h ago",
    title: "PostgreSQL 17 query optimizer gains adaptive join execution",
    takeaway:
      "Query plans dynamically pivot between hash and merge joins when cardinality estimates deviate at runtime.",
    insight:
      "By evaluating initial batch yields against planner statistics, the executor avoids pathological nested loop degradations on skewed data. Production query regressions on large multi-table joins are reduced by over 60%.",
    score: 9.3,
  },
  {
    rank: 3,
    topic: "Security",
    source: "Ars Technica",
    time: "6h ago",
    title: "Critical memory corruption vulnerability identified in libssh2 handshake",
    takeaway:
      "Remote code execution vector mitigated in v1.11.1; audit all embedded telemetry and gateway instances.",
    insight:
      "The vulnerability stems from improper packet length validation during Diffie-Hellman key exchange processing. Affected systems running unpatched daemon wrappers allow unauthenticated arbitrary heap overwrites prior to session authorization.",
    score: 9.8,
  },
];

const FEATURES = [
  {
    icon: Zap,
    label: "00:15 UTC Dispatch",
    desc: "Nightly automated indexing across primary engineering sources",
  },
  {
    icon: Search,
    label: "Hybrid Retrieval",
    desc: "Dense vector embeddings + Reciprocal Rank Fusion search",
  },
  {
    icon: MessageSquare,
    label: "Corpus Query",
    desc: "Grounded Q&A with direct source citation provenance",
  },
  {
    icon: Inbox,
    label: "Direct Delivery",
    desc: "Structured technical briefings delivered to your inbox",
  },
];

const TOPIC_PILLS = [
  "Systems",
  "Databases",
  "AI / ML",
  "Security",
  "Infra",
  "Compilers",
  "Networking",
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted tabular-nums">
      <Star size={12} className="text-wire fill-wire" aria-hidden="true" />
      <span>{score.toFixed(1)}</span>
    </span>
  );
}

/** Animated preview card shown in the hero left panel */
function PreviewCard({
  story,
  visible,
  delay,
}: {
  story: typeof PREVIEW_STORIES[number];
  visible: boolean;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-hairline bg-surface p-5 sm:p-6 transition-all duration-700 hover:border-foreground/30 hover:shadow-md",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {story.rank === 1 ? (
          <span className="inline-flex items-center rounded-full border border-wire/40 bg-wire/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-wire">
            #01 WIRE
          </span>
        ) : (
          <span className="font-mono text-xs text-muted">
            #{story.rank < 10 ? `0${story.rank}` : story.rank}
          </span>
        )}
        <span className="rounded-full border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-xs text-foreground">
          {story.topic}
        </span>
        <span className="font-mono text-xs text-muted">{story.source}</span>
        <span className="font-mono text-xs text-muted">· {story.time}</span>
      </div>

      <p className="mt-3 font-display font-bold tracking-tight text-base leading-snug text-foreground">
        {story.title}
      </p>

      {/* Key Takeaway */}
      <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-foreground/90">
        {story.takeaway}
      </p>

      {/* In-depth Insight paragraph (matching real Skim digest depth) */}
      <p className="mt-2 text-xs sm:text-sm font-normal leading-relaxed text-secondary">
        {story.insight}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-hairline/60 pt-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground">
          Read wire story <ArrowRight size={13} className="text-muted" />
        </span>
        <ScoreBadge score={story.score} />
      </div>
    </div>
  );
}

/** Animated ticker showing "N stories today" */
function LiveTicker() {
  const [count, setCount] = useState(0);
  const target = 12;
  useEffect(() => {
    if (count >= target) return;
    const t = setTimeout(() => setCount((c) => Math.min(c + 1, target)), 80);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-wire/30 bg-wire/10 px-3.5 py-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wire opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-wire" />
      </span>
      <span className="font-mono text-xs font-medium text-foreground">
        LIVE WIRE · {count} stories today
      </span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [method, setMethod] = useState<Method>("password");
  const [step, setStep] = useState<Step>("input");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [urlErrorMessage] = useState(readUrlErrorMessage);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);

  // Cards animate in after mount
  const [cardsVisible, setCardsVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setCardsVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/auth/complete");
    });
  }, [router, supabase.auth]);

  const displayFeedback =
    feedback ??
    (urlErrorMessage ? { text: urlErrorMessage, kind: "error" as const } : null);

  /* ─── Auth handlers ─── */

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

  async function submitInput(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (method === "password") {
      if (mode === "signup") {
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) {
          setFeedback({ text: error.message, kind: "error" });
        } else if (data.session) {
          router.push("/auth/complete");
        } else {
          setStep("verify-email-link");
          setFeedback({
            text: "Registration successful! Please check your email to verify your account before signing in.",
            kind: "info",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) setFeedback({ text: error.message, kind: "error" });
        else router.push("/auth/complete");
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: mode === "signup" },
      });
      if (error) {
        setFeedback({ text: error.message, kind: "error" });
      } else {
        setStep("verify-otp");
        setFeedback({
          text:
            mode === "signup"
              ? "Enter the 6-digit code we sent to verify your new account."
              : "Enter the 6-digit login code from your email.",
          kind: "info",
        });
      }
    }
    setLoading(false);
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
    setStep("input");
    setOtp("");
    setFeedback(null);
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  /* ─── Render ─── */

  return (
    <div className="relative min-h-dvh flex flex-col justify-center bg-canvas px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16 xl:px-16">
      {/* Ambient background glow & hairline mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 20% 25%, rgba(212,85,43,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--skim-hairline) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">

          {/* ── LEFT COLUMN: Hero content & Preview wire cards ── */}
          <div className="flex flex-col lg:col-span-7 xl:col-span-7">
            {/* Wordmark */}
            <div className="flex items-center">
              <BrandMark size="lg" />
            </div>

            {/* Live ticker */}
            <div className="mt-8">
              <LiveTicker />
            </div>

            {/* Hero headline */}
            <h1 className="mt-6 font-display font-bold tracking-tight text-3xl leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem]">
              Signal over noise.
              <br />
              The daily wire for software engineers.
            </h1>

            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-secondary sm:text-base">
              Skim continuously indexes raw dispatches across Hacker News, RFC releases,
              systems research papers, and engineering blogs every night. Stories are evaluated on technical depth,
              distilled into actionable takeaways, and delivered straight to your dashboard.
            </p>

            {/* Topic pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              {TOPIC_PILLS.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-xs text-foreground"
                >
                  {topic}
                </span>
              ))}
            </div>

            {/* Feature callouts (clean SVG icons without emojis) */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface/80 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-raised text-foreground">
                      <Icon size={16} className="text-foreground" aria-hidden />
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase font-medium text-foreground">
                        {f.label}
                      </p>
                      <p className="mt-0.5 text-xs font-normal leading-snug text-muted">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* In-depth Preview Stories with real technical takeaways */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-wider text-muted">
                  Sample Wire Dispatches
                </p>
                <span className="font-mono text-xs text-muted">00:15 UTC Edition</span>
              </div>
              {PREVIEW_STORIES.map((story, i) => (
                <PreviewCard
                  key={story.rank}
                  story={story}
                  visible={cardsVisible}
                  delay={i * 100}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Elevated, focused Auth Terminal Card ── */}
          <div className="flex justify-center lg:col-span-5 xl:col-span-5 lg:sticky lg:top-8">
            <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-7 sm:p-9 shadow-xl shadow-black/10">

              {/* Panel header */}
              <div className="mb-6">
                <p className={ui.eyebrow}>Terminal Access</p>
                <h2 className="mt-2 font-display font-bold tracking-tight text-2xl text-foreground">
                  {mode === "signup" ? "Request subscriber access" : "Sign in to Skim"}
                </h2>
                <p className="mt-2 font-sans text-xs leading-relaxed text-secondary sm:text-sm">
                  {mode === "signup"
                    ? "Register with email or Google. New accounts undergo editorial review."
                    : "Authenticate with your Google credentials, password, or direct login code."}
                </p>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-full border border-hairline bg-surface-raised p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={cn(
                    "flex-1 rounded-full py-2 text-xs font-medium transition-all cursor-pointer",
                    mode === "signin"
                      ? "border border-hairline bg-canvas text-foreground shadow-sm"
                      : "text-secondary hover:text-foreground"
                  )}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={cn(
                    "flex-1 rounded-full py-2 text-xs font-medium transition-all cursor-pointer",
                    mode === "signup"
                      ? "border border-hairline bg-canvas text-foreground shadow-sm"
                      : "text-secondary hover:text-foreground"
                  )}
                >
                  Sign up
                </button>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-hairline bg-canvas py-3 text-sm font-normal text-foreground transition hover:border-foreground/40 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* Google logo SVG */}
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-hairline" />
                <span className="text-xs font-normal text-muted">or email</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>

              {/* Email form */}
              {step === "verify-otp" ? (
                <form onSubmit={verifyOtp} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-normal text-secondary" htmlFor="otp-code">
                      6-digit code
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className={cn(ui.input, "text-center text-lg tracking-[0.3em]")}
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(ui.btnPrimary, "w-full")}
                  >
                    {loading ? "Verifying…" : "Verify code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="w-full cursor-pointer text-xs font-normal text-secondary transition hover:text-foreground"
                  >
                    ← Use a different email
                  </button>
                </form>
              ) : step === "verify-email-link" ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-surface-raised text-foreground">
                    <MailCheck size={22} className="text-wire" />
                  </div>
                  <p className="mt-3 text-sm font-normal leading-relaxed text-foreground">
                    Verification email dispatched.
                  </p>
                  <p className="text-xs font-normal leading-relaxed text-secondary">
                    Please check your inbox and click the verification link to activate your subscriber slot.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("input")}
                    className="cursor-pointer text-xs font-normal text-secondary transition hover:text-foreground"
                  >
                    ← Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={submitInput} className="space-y-3">
                  {mode === "signup" && method === "password" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-normal text-secondary" htmlFor="auth-name">
                        Full name
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        placeholder="Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={ui.input}
                        autoComplete="name"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-normal text-secondary" htmlFor="auth-email">
                      Email
                    </label>
                    <input
                      id="auth-email"
                      ref={emailRef}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={ui.input}
                      autoComplete={mode === "signup" ? "email" : "username"}
                      required
                    />
                  </div>

                  {method === "password" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-normal text-secondary" htmlFor="auth-password">
                        Password
                      </label>
                      <input
                        id="auth-password"
                        type="password"
                        placeholder={mode === "signup" ? "Create a password" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={ui.input}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(ui.btnPrimary, "mt-1 w-full")}
                  >
                    {loading
                      ? "Please wait…"
                      : method === "password"
                      ? mode === "signup"
                        ? "Request access"
                        : "Sign in"
                      : mode === "signup"
                      ? "Send access code"
                      : "Send login code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod(method === "password" ? "otp" : "password");
                      setFeedback(null);
                    }}
                    className="w-full cursor-pointer text-xs font-normal text-secondary transition hover:text-foreground"
                  >
                    {method === "password"
                      ? "Use an email login code instead"
                      : "Use a password instead"}
                  </button>
                </form>
              )}

              {/* Feedback */}
              {displayFeedback ? (
                <div
                  className={cn(
                    "mt-4 rounded-2xl border px-4 py-3 text-xs font-normal",
                    displayFeedback.kind === "error"
                      ? "border-error/40 bg-error-surface text-error"
                      : "border-hairline bg-surface-raised text-foreground"
                  )}
                  role="alert"
                >
                  {displayFeedback.text}
                </div>
              ) : null}

              {/* Footer note */}
              <p className="mt-6 text-center text-xs font-normal leading-relaxed text-muted">
                Skim is an invite-approved engineering wire.
                <br />
                Access is granted based on verified subscriber capacity.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
