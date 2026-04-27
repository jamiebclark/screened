"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/about/version", label: "Version" },
] as const;

export function SiteFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const homeActive = pathname === "/";

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-start"
        >
          <Link
            prefetch={false}
            href="/"
            className={cn(
              "text-sm font-semibold transition-colors",
              homeActive
                ? "text-foreground"
                : "text-primary hover:text-primary/90",
            )}
          >
            Screened
          </Link>
          {footerLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                prefetch={false}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="text-center text-xs text-muted-foreground sm:text-right">
          © {year} Screened
        </p>
      </div>
    </footer>
  );
}
