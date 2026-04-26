"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "General",
    items: [
      { href: "/settings/account", label: "Account" },
      { href: "/settings/preferences", label: "Saved preferences" },
      { href: "/settings/watch-history", label: "Watch history & imports" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { href: "/settings/plex", label: "Plex" },
      { href: "/settings/letterboxd", label: "Letterboxd" },
    ],
  },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6" aria-label="Settings sections">
      <div>
        <Link
          href="/settings"
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          Overview
        </Link>
      </div>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
