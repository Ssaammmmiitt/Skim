"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        className="flex min-h-screen flex-col items-center justify-center bg-[#0f1419] p-6 text-[#f0f9ff]"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <div className="w-full max-w-md text-center">
          {/* Brandmark */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "2rem",
                width: "2rem",
                borderRadius: "0.5rem",
                background: "#06b6d4",
                fontWeight: "bold",
                color: "#000",
                fontSize: "0.875rem",
              }}
            >
              S
            </span>
            <span style={{ fontWeight: "bold", fontSize: "1.125rem" }}>Skim</span>
          </div>

          {/* Icon */}
          <div
            style={{
              margin: "0 auto 1.5rem",
              width: "4rem",
              height: "4rem",
              borderRadius: "9999px",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="12" stroke="#f87171" strokeWidth="1.75" />
              <path d="M14 9v6M14 18v1" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.75rem" }}>
            Skim encountered a critical error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: "1.6", marginBottom: "0.5rem" }}>
            {error.message || "Please refresh the page or try again later."}
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Error ID:{" "}
              <code
                style={{
                  background: "#1a2332",
                  borderRadius: "0.25rem",
                  padding: "0.125rem 0.375rem",
                  fontSize: "0.7rem",
                }}
              >
                {error.digest}
              </code>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              background: "#06b6d4",
              padding: "0.625rem 1.5rem",
              fontSize: "0.75rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.075em",
              color: "#000",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#475569" }}>
            If this persists,{" "}
            <a
              href={`mailto:support@skim.example?subject=Critical+Error&body=${encodeURIComponent(
                `Error: ${error.message}\nDigest: ${error.digest ?? "n/a"}`
              )}`}
              style={{ color: "#22d3ee" }}
            >
              contact support
            </a>
            .
          </p>
        </div>
      </body>
    </html>
  );
}
