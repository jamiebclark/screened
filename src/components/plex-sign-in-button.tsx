"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlexSignInButtonProps {
  callbackUrl?: string;
}

export function PlexSignInButton({ callbackUrl = "/" }: PlexSignInButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinId = searchParams.get("pinId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the return from Plex auth (pinId in URL)
  useEffect(() => {
    if (!pinId) return;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });

    const verify = async () => {
      try {
        const res = await fetch("/api/plex/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify-pin", pinId: parseInt(pinId) }),
        });
        const data = await res.json() as { verified?: boolean; plexToken?: string };

        if (!data.verified || !data.plexToken) {
          setError("Plex sign-in was not completed. Please try again.");
          setLoading(false);
          return;
        }

        const result = await signIn("plex", {
          plexToken: data.plexToken,
          redirect: false,
        });

        if (result?.error) {
          setError("Could not sign in with Plex. Please try again.");
          setLoading(false);
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    };

    verify();
  }, [pinId, callbackUrl, router]);

  const handlePlexSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/plex/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-pin" }),
      });
      const data = await res.json() as { authUrl?: string };

      if (!data.authUrl) {
        setError("Could not reach Plex. Please try again.");
        setLoading(false);
        return;
      }

      // Open Plex auth — after completion Plex redirects back to /login?pinId=...
      window.location.href = data.authUrl;
    } catch {
      setError("Could not reach Plex. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-[#E5A00D]/40 hover:border-[#E5A00D] hover:bg-[#E5A00D]/10"
        onClick={handlePlexSignIn}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Tv2 className="h-4 w-4 text-[#E5A00D]" />
        )}
        {loading && !!pinId ? "Signing in with Plex..." : "Sign in with Plex"}
      </Button>
    </div>
  );
}
