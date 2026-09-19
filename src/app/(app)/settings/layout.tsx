import { isTraktConfigured } from "@/lib/trakt";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <aside className="shrink-0 md:w-56 md:border-r md:border-border md:pr-8">
          <SettingsNav traktConfigured={isTraktConfigured()} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
