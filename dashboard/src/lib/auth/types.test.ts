import { describe, expect, it } from "vitest";
import { isAdmin, isSuperuser } from "@/lib/auth/types";
import { activeSuperuser, pendingMember } from "@/test/fixtures";

describe("auth types", () => {
  it("isAdmin returns true for active superuser and admin", () => {
    expect(isAdmin(activeSuperuser)).toBe(true);
    expect(isAdmin({ ...activeSuperuser, role: "admin" })).toBe(true);
  });

  it("isAdmin returns false for pending or member", () => {
    expect(isAdmin(pendingMember)).toBe(false);
    expect(isAdmin({ ...activeSuperuser, role: "member" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("isSuperuser returns true only for active superuser", () => {
    expect(isSuperuser(activeSuperuser)).toBe(true);
    expect(isSuperuser({ ...activeSuperuser, role: "admin" })).toBe(false);
    expect(isSuperuser(pendingMember)).toBe(false);
  });
});
