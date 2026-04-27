"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlexSignInButtonProps {
  callbackUrl?: string;
  /** When true, the button is inert and shows an error if clicked is not needed—parent shows explanation. */
  disabled?: boolean;
  disabledReason?: string;
}

export function PlexSignInButton({
  callbackUrl = "/",
  disabled,
  disabledReason,
}: PlexSignInButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pinId = searchParams.get("pinId");
  const invite = searchParams.get("invite");

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
          body: JSON.stringify({
            action: "verify-pin",
            pinId: parseInt(pinId),
          }),
        });
        const data = (await res.json()) as {
          verified?: boolean;
          plexToken?: string;
        };

        if (!data.verified || !data.plexToken) {
          setError("Plex sign-in was not completed. Please try again.");
          setLoading(false);
          return;
        }

        const result = await signIn("plex", {
          plexToken: data.plexToken,
          inviteToken: invite ?? undefined,
          redirect: false,
        });

        if (result?.error) {
          setError(
            "Could not sign in with Plex. If you are new, open the full invite link from your server admin (it includes ?invite= in the address bar) and try again.",
          );
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
  }, [pinId, callbackUrl, router, invite]);

  const handlePlexSignIn = async () => {
    if (disabled) {
      setError(disabledReason ?? "Sign-in is not available right now.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const returnPath =
        pathname && pathname.startsWith("/") ? pathname : "/login";
      const res = await fetch("/api/plex/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-pin",
          returnPath,
          invite: invite ?? undefined,
        }),
      });
      const data = (await res.json()) as { authUrl?: string };

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
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-[#E5A00D]/40 hover:border-[#E5A00D] hover:bg-[#E5A00D]/10"
        onClick={handlePlexSignIn}
        disabled={loading || disabled}
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
