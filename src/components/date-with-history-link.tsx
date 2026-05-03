import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { historyDayPath, localCalendarParts } from "@/lib/history-calendar";
import { cn } from "@/lib/utils";

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function DateWithHistoryLink({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const { year, month, day } = localCalendarParts(new Date(date));
  const href = historyDayPath(year, month, day);
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      {formatDate(date)}
      <Link
        href={href}
        className="hover:text-foreground transition-colors"
        title="View on calendar"
      >
        <CalendarDays className="h-4 w-4" />
      </Link>
    </span>
  );
}
