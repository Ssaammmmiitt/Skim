type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  category?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mailConfig() {
  const token = process.env.MAILTRAP_API_TOKEN;
  const sender = process.env.MAILTRAP_SENDER_EMAIL;
  if (!token || !sender) return null;
  return {
    token,
    sender,
    senderName: process.env.MAILTRAP_SENDER_NAME ?? "Skim",
  };
}

export async function sendMail({
  to,
  subject,
  html,
  category = "Skim",
}: SendMailOptions): Promise<boolean> {
  const config = mailConfig();
  if (!config) return false;

  const response = await fetch("https://send.api.mailtrap.io/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: config.sender, name: config.senderName },
      to: [{ email: to }],
      subject,
      html,
      category,
    }),
  });

  if (!response.ok) {
    console.error("mailtrap send failed:", response.status, await response.text());
    return false;
  }

  return true;
}

export async function notifyAdminOfSignup(profile: {
  email: string;
  display_name: string | null;
  auth_provider: string | null;
}): Promise<void> {
  const adminEmail =
    process.env.SKIM_ADMIN_CONTACT_EMAIL ?? process.env.SKIM_SUPERUSER_EMAIL;
  if (!adminEmail) return;

  const name = escapeHtml(profile.display_name ?? profile.email);
  const email = escapeHtml(profile.email);
  const provider = escapeHtml(profile.auth_provider ?? "email");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skim-azure.vercel.app";
  const html = `
    <p><strong>New Skim signup awaiting approval</strong></p>
    <p>Name: ${name}<br/>Email: ${email}<br/>Provider: ${provider}</p>
    <p>Review requests in the <a href="${site}/admin">Admin panel</a>.</p>
  `;

  await sendMail({
    to: adminEmail,
    subject: `Skim: new signup  -  ${profile.email}`,
    html,
    category: "Skim Admin",
  });
}

export async function notifyUserApproved(profile: {
  email: string;
  display_name: string | null;
}): Promise<void> {
  const name = escapeHtml(profile.display_name ?? profile.email);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skim-azure.vercel.app";
  const loginUrl = `${site}/login`;

  const html = `
    <p>Hi ${name},</p>
    <p><strong>Your Skim account has been approved.</strong></p>
    <p>You can sign in now to browse daily digests, search the corpus, and use RAG chat:</p>
    <p><a href="${loginUrl}">${loginUrl}</a></p>
    <p>You'll receive the daily digest email according to your Settings preferences.</p>
    <p> -  Skim</p>
  `;

  await sendMail({
    to: profile.email,
    subject: "Skim: your account is approved",
    html,
    category: "Skim Onboarding",
  });
}
