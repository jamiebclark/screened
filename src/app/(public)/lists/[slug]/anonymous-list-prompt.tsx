import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The single call to action shown to logged-out visitors on a public list,
 * in place of the vote / comment / add controls members would see.
 */
export function AnonymousListPrompt({
  slug,
  compact = false,
  className,
}: {
  slug: string;
  /** Tighter variant for the item modal. */
  compact?: boolean;
  className?: string;
}) {
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/lists/${slug}`)}`;

  return (
    <div
      data-testid="anonymous-list-prompt"
      className={cn(
        "flex flex-col gap-1",
        compact ? "items-start" : "items-start sm:items-end",
        className,
      )}
    >
      <Button asChild size={compact ? "sm" : "default"}>
        <Link href={loginHref}>
          <LogIn className="h-4 w-4" />
          Sign in to vote and comment
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        or{" "}
        <Link href="/register" className="underline hover:text-foreground">
          create an account
        </Link>
      </p>
    </div>
  );
}
