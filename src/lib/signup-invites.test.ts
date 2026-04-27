import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  hashInviteToken,
  isPublicSignupAllowed,
  isSiteAdminEmail,
} from "./signup-invites";

const original = { ...process.env };

describe("hashInviteToken", () => {
  it("returns consistent hex for the same string", () => {
    const a = hashInviteToken("test-token-1");
    const b = hashInviteToken("test-token-1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different strings", () => {
    expect(hashInviteToken("a")).not.toBe(hashInviteToken("b"));
  });
});

describe("isPublicSignupAllowed", () => {
  beforeEach(() => {
    process.env = { ...original };
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("default allows public signup", () => {
    delete process.env.ALLOW_PUBLIC_SIGNUP;
    expect(isPublicSignupAllowed()).toBe(true);
  });

  it("false when ALLOW_PUBLIC_SIGNUP is false", () => {
    process.env.ALLOW_PUBLIC_SIGNUP = "false";
    expect(isPublicSignupAllowed()).toBe(false);
  });
});

describe("isSiteAdminEmail", () => {
  beforeEach(() => {
    process.env = {
      ...original,
      SITE_ADMIN_EMAILS: "Admin@X.com, other@y.org",
    };
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("matches case-insensitively", () => {
    expect(isSiteAdminEmail("admin@x.com")).toBe(true);
    expect(isSiteAdminEmail("other@Y.org")).toBe(true);
  });

  it("rejects other emails", () => {
    expect(isSiteAdminEmail("nope@x.com")).toBe(false);
  });
});
