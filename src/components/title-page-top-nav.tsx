import Link from "next/link";

export function TitlePageTopNav() {
  return (
    <nav
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
      aria-label="Page navigation"
    >
      <Link href="/search" className="hover:text-foreground transition-colors">
        Search
      </Link>
      <span className="select-none text-border" aria-hidden>
        ·
      </span>
      <Link href="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
    </nav>
  );
}
