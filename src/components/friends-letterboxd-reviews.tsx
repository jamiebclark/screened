import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { titlePageSection } from "@/lib/title-page-layout";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";
import { siLetterboxd } from "simple-icons";
import type { TitlePageWatchEntry } from "@/lib/watch-history-queries";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function FriendsLetterboxdReviews({
  entries,
}: {
  entries: TitlePageWatchEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <div className={titlePageSection}>
      <Separator className="mb-8" />
      <h3 className="text-base font-semibold mb-4">Users on Letterboxd</h3>
      <div className="space-y-6">
        {entries.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/profile/${entry.user?.id}`}
                className="shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={entry.user?.avatarUrl ?? undefined}
                    alt=""
                  />
                  <AvatarFallback className="text-xs">
                    {entry.user ? initialsFromName(entry.user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link
                href={`/profile/${entry.user?.id}`}
                className="text-sm font-medium hover:text-primary hover:underline underline-offset-4"
              >
                {entry.user?.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {entry.watchedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {entry.review && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-9 whitespace-pre-line">
                {entry.review}
              </p>
            )}
            {entry.letterboxdActivityUrl && (
              <div className="pl-9 mt-1.5">
                <a
                  href={entry.letterboxdActivityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SimpleBrandIcon icon={siLetterboxd} className="h-3 w-3" />
                  Read on Letterboxd
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 mt-6">
        Reviews via Letterboxd
      </p>
    </div>
  );
}
