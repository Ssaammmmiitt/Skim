"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

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

/* ─── Static preview data (hero left panel) ─────────────────────────────── */

const PREVIEW_STORIES = [
  {
    rank: 1,
    topic: "AI / ML",
    topicClass: "bg-topic-ai text-topic-ai-text",
    source: "TechCrunch",
    time: "2h ago",
    title: "OpenAI ships a new o3-mini reasoning model with 40% cost reduction",
    takeaway: "Cheaper agent workflows unlock a new tier of production viability.",
    score: 9.4,
  },
  {
    rank: 2,
    topic: "Cloud",
    topicClass: "bg-topic-cloud text-topic-cloud-text",
    source: "Ars Technica",
    time: "4h ago",
    title: "AWS announces per-second billing for all Lambda invocations",
    takeaway: "Significant savings for burst workloads with sub-100ms functions.",
    score: 8.1,
  },
  {
    rank: 3,
    topic: "Security",
    topicClass: "bg-topic-security text-topic-security-text",
    source: "The Verge",
    time: "6h ago",
    title: "Critical zero-day found in widely used open-source SSH library",
    takeaway: "Patch immediately — affects any embedded system running libssh2.",
    score: 9.7,
  },
  {
    rank: 4,
    topic: "Startups",
    topicClass: "bg-topic-startups text-topic-startups-text",
    source: "MIT Tech Review",
    time: "8h ago",
    title: "Andreessen Horowitz leads $120M Series B in AI infra startup",
    takeaway: "Infrastructure bets are back — this round signals a pivot from apps.",
    score: 7.6,
  },
];

const FEATURES = [
  {
    icon: "⚡",
    label: "Daily at 00:15 UTC",
    desc: "Agentic pipeline runs every night",
  },
  {
    icon: "🔍",
    label: "Hybrid RAG search",
    desc: "Vector + full-text across the entire corpus",
  },
  {
    icon: "💬",
    label: "Ask your feed",
    desc: "Chat with your digest using Gemini + Groq",
  },
  {
    icon: "📧",
    label: "Email digest",
    desc: "Curated briefing delivered to your inbox",
  },
];

const TOPIC_PILLS = [
  { label: "AI / ML", cls: "bg-topic-ai text-topic-ai-text" },
  { label: "Web Dev", cls: "bg-topic-web text-topic-web-text" },
  { label: "Cloud", cls: "bg-topic-cloud text-topic-cloud-text" },
  { label: "Security", cls: "bg-topic-security text-topic-security-text" },
  { label: "Startups", cls: "bg-topic-startups text-topic-startups-text" },
  { label: "Programming", cls: "bg-topic-code text-topic-code-text" },
  { label: "Science", cls: "bg-topic-science text-topic-science-text" },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className="text-wire">
      <path d="M6 1l1.236 3.354H11L8.382 6.292l.854 3.354L6 7.708 2.764 9.646l.854-3.354L.999 4.354H4.764z" />
    </svg>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5 tabular-nums font-mono text-xs font-medium text-secondary">
        <StarIcon />
        {score.toFixed(1)}
      </span>
    </div>
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
        "rounded-2xl border border-border bg-surface p-5 transition-all duration-700 hover:border-hairline",
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
        <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 font-mono text-xs text-foreground">
          {story.topic}
        </span>
        <span className="font-mono text-xs text-muted">
          {story.source}
        </span>
        <span className="font-mono text-xs text-muted">{story.time}</span>
      </div>

      <p className="mt-3 font-display font-bold tracking-tight text-base leading-snug text-foreground line-clamp-2">
        {story.title}
      </p>
      <p className="mt-1.5 text-xs font-normal leading-relaxed text-secondary line-clamp-2">
        {story.takeaway}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-xs text-foreground">
          Read wire story →
        </span>
        <ScoreBar score={story.score} />
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
    const t = setTimeout(() => setCardsVisible(true), 200);
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

  /* ─── Auth handlers (100% identical to original) ─── */

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
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">

      {/* ── LEFT — Hero panel ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden px-6 py-10 sm:px-10 lg:px-14 lg:py-14">

        {/* Subtle warm glow behind hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 20% 30%, rgba(212,85,43,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Wire rule overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--skim-hairline) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex flex-col">

          {/* Wordmark */}
          <div className="flex items-center gap-3">
            <span
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface font-display font-bold text-sm text-foreground shadow-sm"
              aria-hidden
            >
              S
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-wire" />
            </span>
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
              Skim
            </span>
          </div>

          {/* Live ticker */}
          <div className="mt-8">
            <LiveTicker />
          </div>

          {/* Hero headline */}
          <h1 className="mt-6 font-display font-bold tracking-tight text-3xl leading-[1.15] text-foreground sm:text-4xl lg:text-[2.75rem]">
            Your daily tech briefing,
            <br />
            curated by AI.
          </h1>

          <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-secondary sm:text-base">
            Skim ingests stories from HN, TechCrunch, Ars, The Verge and MIT
            Tech Review every night, ranks them by importance, and delivers a
            clean digest to your inbox — with a RAG chat assistant built in.
          </p>

          {/* Topic pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {TOPIC_PILLS.map((t) => (
              <span
                key={t.label}
                className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground"
              >
                {t.label}
              </span>
            ))}
          </div>

          {/* Feature callouts */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-3 rounded-2xl border border-border bg-surface/70 p-4"
              >
                <span className="text-lg leading-none" aria-hidden>
                  {f.icon}
                </span>
                <div>
                  <p className="font-mono text-xs uppercase font-medium text-foreground">{f.label}</p>
                  <p className="mt-0.5 text-xs font-normal leading-snug text-muted">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Preview cards — hidden on small mobile, visible md+ */}
          <div className="mt-10 hidden space-y-4 md:block lg:mt-12">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">
              Today&apos;s wire stories
            </p>
            {PREVIEW_STORIES.slice(0, 3).map((story, i) => (
              <PreviewCard
                key={story.rank}
                story={story}
                visible={cardsVisible}
                delay={i * 120}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT — Auth panel ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-center bg-surface px-6 py-10 sm:px-10 lg:min-h-dvh lg:w-[440px] lg:shrink-0 lg:items-center lg:py-14 border-t lg:border-t-0 lg:border-l border-border">
        <div className="w-full max-w-sm">

          {/* Panel header */}
          <div className="mb-8">
            <p className={ui.eyebrow}>Get started</p>
            <h2 className="mt-2 font-display font-bold tracking-tight text-2xl text-foreground">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-secondary">
              {mode === "signup"
                ? "Register with email or Google. New accounts require admin approval."
                : "Sign in with Google, password, or a login code."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-full border border-border bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={cn(
                "flex-1 rounded-full py-2 text-xs font-medium transition-all cursor-pointer",
                mode === "signin"
                  ? "border border-border-on-dark bg-canvas text-foreground shadow-sm"
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
                  ? "border border-border-on-dark bg-canvas text-foreground shadow-sm"
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
            className={cn(
              "mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-canvas py-3 text-sm font-normal text-foreground transition hover:border-foreground/40 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {/* Google logo */}
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
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-normal text-muted">or email</span>
            <span className="h-px flex-1 bg-border" />
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
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised text-2xl">
                📬
              </div>
              <p className="mt-4 text-sm font-normal italic leading-relaxed text-secondary">
                &quot;The quality of curation is completely unmatched. I don&apos;t know how I stayed informed before Skim. It&apos;s the first thing I read every morning.&quot;
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
                    ? "Create account"
                    : "Sign in"
                  : mode === "signup"
                  ? "Send registration code"
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
                  ? "border-border bg-surface text-secondary"
                  : "border-border bg-surface text-foreground"
              )}
              role="alert"
            >
              {displayFeedback.text}
            </div>
          ) : null}

          {/* Footer note */}
          <p className="mt-8 text-center text-xs font-normal leading-relaxed text-muted">
            Skim is a curated, invite-approved digest platform.
            <br />
            New accounts await admin review before access is granted.
          </p>
        </div>
      </div>
    </div>
  );
}
