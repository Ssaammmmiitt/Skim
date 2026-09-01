import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import * as ui from "@/lib/tailwind-ui";

export const metadata = {
  title: "Privacy Policy  -  Skim",
  description: "How Skim collects and uses your data.",
};

export default function PrivacyPage() {
  return (
    <PageContainer size="lg">
      <div className="mx-auto max-w-2xl py-10">
        <p className={ui.eyebrow}>Skim</p>
        <h1 className={`${ui.heading} mt-2`}>Privacy Policy</h1>
        <p className={`${ui.body} mt-4`}>
          Last updated: September 2026. This policy describes how Skim (“we”)
          handles information when you use the dashboard at{" "}
          <a
            href="https://skim-azure.vercel.app"
            className="text-cyan-bright hover:underline"
          >
            skim-azure.vercel.app
          </a>{" "}
          and receive daily digest emails.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            What we collect
          </h2>
          <ul className={`${ui.body} list-inside list-disc space-y-2`}>
            <li>
              <strong>Account data</strong>  -  email, display name, and profile
              picture from Google sign-in (or email address for OTP login).
            </li>
            <li>
              <strong>Preferences</strong>  -  digest theme, format, topic
              filters, and dashboard appearance settings you save in Settings.
            </li>
            <li>
              <strong>Usage</strong>  -  chat query counts for daily rate limits;
              pipeline run logs (no message content stored long-term beyond chat
              session).
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            How we use it
          </h2>
          <ul className={`${ui.body} list-inside list-disc space-y-2`}>
            <li>Authenticate you and enforce admin approval before access.</li>
            <li>Send personalized daily digest emails you opt into.</li>
            <li>Power search and RAG chat over the public article corpus.</li>
            <li>Notify the admin when new users request access.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Third-party services
          </h2>
          <p className={ui.body}>
            We use Supabase (database and auth), Google (OAuth), Mailtrap
            (email delivery), Google Gemini and Groq (LLM), and Hugging Face
            (query embeddings on Vercel). Each provider processes data under
            their own terms.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p className={ui.body}>
            Questions or deletion requests: contact the project admin via the
            email shown on the signup wait page or your digest sender address.
          </p>
        </section>

        <Link href="/login" className={`${ui.btnGhost} mt-10 inline-block`}>
          Back to sign in
        </Link>
      </div>
    </PageContainer>
  );
}
