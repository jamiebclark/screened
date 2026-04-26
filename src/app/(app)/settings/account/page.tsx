import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AccountSettings } from "./account-settings";

export const metadata = { title: "Account | Screened" };

function hasBcryptPasswordHash(passwordHash: string): boolean {
  return passwordHash.startsWith("$2");
}

export default async function AccountSettingsPage() {
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, passwordHash: true },
  });

  if (!user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Account</h1>
      <p className="text-muted-foreground mb-8">
        Update your profile and password. Your display name is shown to others on Screened.
      </p>
      <AccountSettings
        user={{
          name: user.name,
          email: user.email,
          hasCredentialPassword: hasBcryptPasswordHash(user.passwordHash),
        }}
      />
    </div>
  );
}
