import { NextResponse } from "next/server";
import { isPublicSignupAllowed } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";

/**
 * Unauthenticated. Lets auth pages show accurate copy for invite-only vs public signup
 * and whether a bootstrap (first user) registration is available without an invite.
 */
export async function GET() {
  const publicSignup = isPublicSignupAllowed();
  const userCount = await prisma.user.count();
  const bootstrapAllowWithoutInvite = !publicSignup && userCount === 0;

  return NextResponse.json({
    publicSignup,
    /** New accounts require a valid invite (when not bootstrap). */
    inviteOnly: !publicSignup,
    /** First account can be created without an invite when the database has no users. */
    bootstrapAllowWithoutInvite,
  });
}
