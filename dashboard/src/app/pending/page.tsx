import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/types";

function contactAdminHref(userEmail: string | undefined, adminEmail: string) {
  const subject = encodeURIComponent("Skim access request");
  const body = encodeURIComponent(
    `Hi,\n\nI signed up for Skim and would like access to the dashboard and daily digest.\n\nMy account email: ${userEmail ?? "(unknown)"}\n\nThank you.`
  );
  return `mailto:${adminEmail}?subject=${subject}&body=${body}`;
}

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .maybeSingle<Profile>();

  const rejected = profile?.status === "rejected";
  const adminEmail =
    process.env.SKIM_ADMIN_CONTACT_EMAIL ??
    process.env.SKIM_SUPERUSER_EMAIL ??
    "admin@example.com";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="skim-eyebrow">Skim</p>
      <h1 className="skim-heading mt-3">
        {rejected ? "Access not approved" : "Waiting for admin approval"}
      </h1>
      <p className="mt-4 skim-body">
        {rejected
          ? "Your signup request was declined. You can contact the admin below if you believe this was a mistake."
          : "Your account was created successfully. A Skim admin must approve your request before you can use the dashboard or receive the daily digest."}
      </p>

      {!rejected ? (
        <div className="skim-card mt-6 w-full p-5 text-left skim-body">
          <p className="font-medium text-foreground">What happens next?</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>The admin was notified of your signup.</li>
            <li>
              You&apos;ll get access after approval — check back here or your
              email.
            </li>
            <li>You can email the admin to request access sooner.</li>
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={contactAdminHref(user?.email, adminEmail)}
          className="skim-btn-primary inline-block px-6 py-3 text-sm"
        >
          Contact admin for access
        </a>
        <form action="/auth/signout" method="post">
          <button type="submit" className="skim-btn-secondary px-6 py-3 text-sm">
            Sign out
          </button>
        </form>
      </div>

      {profile?.email ? (
        <p className="mt-6 text-xs text-muted">Signed in as {profile.email}</p>
      ) : null}
    </div>
  );
}
