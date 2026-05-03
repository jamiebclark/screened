"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/history", label: "History" },
  { href: "/stats", label: "Stats" },
  { href: "/activity", label: "Activity" },
];

export function WatchingTabs() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-border mb-8">
      {tabs.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === "/history" && pathname.startsWith("/history/"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
