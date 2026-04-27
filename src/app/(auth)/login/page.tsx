"use client";

import { useState, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Film, Loader2, Eye, Sparkles, Users } from "lucide-react";
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
import { safeCallbackPath } from "@/lib/safe-callback-path";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackPath = safeCallbackPath(searchParams.get("callbackUrl"));
  const invite = searchParams.get("invite");
  const registerHref = invite
    ? `/register?invite=${encodeURIComponent(invite)}`
    : "/register";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(callbackPath);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Choose how you want to sign in</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <PlexSignInButton callbackUrl={callbackPath} />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              or continue with email
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={registerHref}
              className="text-primary hover:underline font-medium"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
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

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-full bg-muted p-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Track what you&apos;ve watched
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-full bg-muted p-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Discover what to watch next
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-full bg-muted p-2">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-tight">
              Pick movies with friends
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <Card className="p-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
