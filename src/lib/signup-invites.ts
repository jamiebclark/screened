import { createHash, randomBytes } from "crypto";
import type { PrismaClient } from "@/generated/prisma";

/** Client passed to Prisma interactive transaction callbacks. */
export type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export function hashInviteToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Unset or any value other than `false` / `0` / `no` (case-insensitive) => public signup allowed. */
export function isPublicSignupAllowed(): boolean {
  const v = process.env.ALLOW_PUBLIC_SIGNUP?.trim().toLowerCase();
  if (v === undefined || v === "") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}

function parseSiteAdminEmails(): string[] {
  return (process.env.SITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSiteAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseSiteAdminEmails().includes(email.toLowerCase());
}

export async function canRegisterWithoutInvite(client: {
  user: { count: () => Promise<number> };
}): Promise<boolean> {
  if (isPublicSignupAllowed()) return true;
  const n = await client.user.count();
  return n === 0;
}

export type ValidateInviteResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "expired" | "exhausted" | "revoked" };

/**
 * Atomically records one use of a signup invite. Call inside the same transaction as `user.create`.
 */
export async function validateAndConsumeInvite(
  tx: PrismaTransaction,
  plainToken: string | undefined,
): Promise<ValidateInviteResult> {
  if (!plainToken || !plainToken.trim()) {
    return { ok: false, code: "invalid" };
  }
  const tokenHash = hashInviteToken(plainToken.trim());
  const invite = await tx.signupInvite.findUnique({ where: { tokenHash } });
  if (!invite) {
    return { ok: false, code: "invalid" };
  }
  if (invite.revokedAt) {
    return { ok: false, code: "revoked" };
  }
  const now = new Date();
  if (invite.expiresAt && invite.expiresAt < now) {
    return { ok: false, code: "expired" };
  }
  if (invite.uses >= invite.maxUses) {
    return { ok: false, code: "exhausted" };
  }

  const updated = await tx.signupInvite.updateMany({
    where: {
      id: invite.id,
      uses: invite.uses,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: { uses: { increment: 1 } },
  });
  if (updated.count !== 1) {
    return { ok: false, code: "invalid" };
  }
  return { ok: true };
}

/**
 * Resolves whether a new user may be created, and if an invite is required but missing/invalid, why.
 * Does not consume an invite; use for diagnostics or when `user.create` is not yet in the same transaction.
 */
export async function shouldAllowNewUser(
  client: { user: { count: () => Promise<number> } },
  options: { inviteToken?: string | null },
): Promise<
  | { allowed: true; mode: "public" | "bootstrap" }
  | { allowed: true; mode: "invite" }
  | { allowed: false; reason: string }
> {
  if (isPublicSignupAllowed()) {
    return { allowed: true, mode: "public" };
  }
  if (await canRegisterWithoutInvite(client)) {
    return { allowed: true, mode: "bootstrap" };
  }
  if (!options.inviteToken?.trim()) {
    return { allowed: false, reason: "Invite required" };
  }
  return { allowed: true, mode: "invite" };
}
