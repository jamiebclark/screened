"use client";

import { usePathname } from "next/navigation";
import { HistoryBreadcrumbs } from "@/components/history-breadcrumbs";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  users: "Users",
  cron: "Cron status",
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean); // ["admin", ...]

  const items = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;
    return {
      label: SEGMENT_LABELS[seg] ?? seg,
      href: isLast ? undefined : href,
    };
  });

  return <HistoryBreadcrumbs items={items} />;
}
