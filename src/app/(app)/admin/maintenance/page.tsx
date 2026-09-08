import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { BACKFILL_DEFAULT_LIMIT } from "@/lib/production-countries";
import { BackfillCountriesButton } from "./backfill-countries-button";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage() {
  const session = await auth();
  if (!isSiteAdminEmail(session?.user?.email)) redirect("/settings");

  const [remaining, total] = await Promise.all([
    prisma.mediaItem.count({ where: { productionCountries: { equals: [] } } }),
    prisma.mediaItem.count(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <AdminBreadcrumbs />
      <h1 className="text-2xl font-bold mb-2">Maintenance</h1>
      <p className="text-muted-foreground mb-8">
        One-off data repairs for titles that predate a metadata field.
      </p>

      <section aria-labelledby="countries-heading" className="space-y-3">
        <h3 id="countries-heading" className="text-base font-semibold">
          Production countries
        </h3>
        <p className="text-sm text-muted-foreground">
          Country data is filled in as titles are enriched, so anything added
          before the field existed is still blank — which is why list stats can
          report 0 countries for a list that is otherwise complete. This walks
          the blank rows and fetches them from TMDB, one call per title, in
          batches of {BACKFILL_DEFAULT_LIMIT}.
        </p>
        <p className="text-sm">
          <span className="font-semibold">{total - remaining}</span> of{" "}
          <span className="font-semibold">{total}</span> titles have country
          data
          {remaining > 0 && (
            <span className="text-muted-foreground">
              {" "}
              — {remaining} still blank
            </span>
          )}
          .
        </p>
        {remaining === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to backfill. Every title TMDB has country data for is
            filled.
          </p>
        ) : (
          <BackfillCountriesButton remaining={remaining} />
        )}
      </section>
    </div>
  );
}
