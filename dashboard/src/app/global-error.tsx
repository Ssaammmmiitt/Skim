"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#0f1419] p-6 text-[#e7edf4]">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Skim encountered a critical error</h1>
          <p className="mt-3 text-sm text-[#94a3b8]">
            {error.message || "Please refresh the page or try again later."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-pill bg-[#22d3ee] px-5 py-2.5 text-sm font-semibold text-black"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
