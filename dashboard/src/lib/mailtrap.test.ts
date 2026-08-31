import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyAdminOfSignup,
  notifyUserApproved,
  sendMail,
} from "@/lib/mailtrap";

describe("mailtrap", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.MAILTRAP_API_TOKEN = "test-token";
    process.env.MAILTRAP_SENDER_EMAIL = "digest@example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://skim.example.com";
    process.env.SKIM_ADMIN_CONTACT_EMAIL = "admin@example.com";
  });

  it("sendMail returns false when env is missing", async () => {
    delete process.env.MAILTRAP_API_TOKEN;
    await expect(
      sendMail({ to: "a@b.com", subject: "Hi", html: "<p>Hi</p>" })
    ).resolves.toBe(false);
  });

  it("notifyUserApproved sends to the approved user", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    await notifyUserApproved({
      email: "user@example.com",
      display_name: "Alex",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.to[0].email).toBe("user@example.com");
    expect(body.subject).toContain("approved");
    expect(body.html).toContain("https://skim.example.com/login");
  });

  it("notifyAdminOfSignup sends to admin contact", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    await notifyAdminOfSignup({
      email: "new@example.com",
      display_name: "New User",
      auth_provider: "google",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.to[0].email).toBe("admin@example.com");
    expect(body.html).toContain("/admin");
  });
});
