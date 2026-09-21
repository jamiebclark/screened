"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const integrationItems = [
  { href: "/settings/plex", label: "Plex" },
  { href: "/settings/jellyfin", label: "Jellyfin" },
  { href: "/settings/letterboxd", label: "Letterboxd" },
  { href: "/settings/tautulli", label: "Tautulli" },
  { href: "/settings/overseerr", label: "Overseerr" },
  { href: "/settings/discord", label: "Discord" },
];

const generalItems = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/privacy", label: "Privacy" },
  { href: "/settings/preferences", label: "Saved preferences" },
  { href: "/settings/watch-history", label: "Watch history & imports" },
  { href: "/settings/calendar", label: "Calendar feed" },
];

export function SettingsNav() {
  const groups = [
    { title: "General", items: generalItems },
    { title: "Integrations", items: integrationItems },
  ];
  const pathname = usePathname();
  const allItems = [
    { href: "/settings", label: "Overview" },
    ...groups.flatMap((g) => g.items),
  ];

  // Below `md` the nav is a single horizontal strip; keep the active pill in
  // view so a deep settings page doesn't open with its own tab scrolled off.
  const activePillRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activePillRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, [pathname]);

  return (
    <>
      <nav
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Settings sections"
      >
        {allItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              ref={active ? activePillRef : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        className="hidden flex-col gap-6 md:flex"
        aria-label="Settings sections"
      >
        <div>
          <Link
            prefetch={false}
            href="/settings"
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
                    prefetch={false}
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
    </>
  );
}
