"use client";

import { useState, FormEvent, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlexSignInButton } from "@/components/plex-sign-in-button";
import { Skeleton } from "@/components/ui/skeleton";

type SignupConfig = {
  publicSignup: boolean;
  inviteOnly: boolean;
  bootstrapAllowWithoutInvite: boolean;
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupConfig, setSignupConfig] = useState<SignupConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/signup-config")
      .then((r) => r.json())
      .then((d: SignupConfig) => {
        if (!cancelled) setSignupConfig(d);
      })
      .catch(() => {
        if (!cancelled) setSignupConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const configLoading = signupConfig === null;
  const needsInviteInUrl =
    !!signupConfig &&
    signupConfig.inviteOnly &&
    !signupConfig.bootstrapAllowWithoutInvite &&
    !inviteFromUrl;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (configLoading || needsInviteInUrl) return;
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      const body: {
        name: string;
        email: string;
        password: string;
        inviteToken?: string;
      } = { name, email, password };
      if (inviteFromUrl) {
        body.inviteToken = inviteFromUrl;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }

      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Join Screened to start tracking</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {needsInviteInUrl && (
          <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            New signups require an invite link from your server admin. Open the
            full URL they sent you, including{" "}
            <code className="text-xs">?invite=…</code>.
          </div>
        )}
        {configLoading && (
          <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
            Checking signup options…
          </p>
        )}
        {signupConfig?.bootstrapAllowWithoutInvite && (
          <div className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            You are creating the <strong>first</strong> account. After this, new
            users will need an invite unless your admin turns public sign-up
            back on.
          </div>
        )}
        <Suspense fallback={<Skeleton className="h-10 w-full rounded-md" />}>
          <PlexSignInButton
            disabled={configLoading || !!needsInviteInUrl}
            disabledReason="Open the invite link you were sent (it must include the invite in the address bar) before using Plex sign-in."
          />
        </Suspense>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              or register with email
            </span>
          </div>
        </div>
      </CardContent>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-0">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              disabled={configLoading || !!needsInviteInUrl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              disabled={configLoading || !!needsInviteInUrl}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              disabled={configLoading || !!needsInviteInUrl}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || configLoading || !!needsInviteInUrl}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-primary">
            <Film className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight">Screened</span>
          </div>
          <p className="text-muted-foreground text-sm">Track movies together</p>
        </div>

        <Suspense
          fallback={
            <Card className="p-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </Card>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
