import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <aside className="shrink-0 border-b border-border pb-6 md:w-56 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <SettingsNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
