import Image from "next/image";
import { getWatchProviders } from "@/lib/tmdb";

interface StreamingProvidersProps {
  tmdbId: number;
  type: "movie" | "tv";
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type ProviderItem = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

function ProviderRow({
  label,
  items,
}: {
  label: string;
  items: ProviderItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground shrink-0 w-16">
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {items.slice(0, 6).map((p) => (
          <div
            key={p.provider_id}
            title={p.provider_name}
            className="rounded-md overflow-hidden w-7 h-7 shrink-0"
          >
            <Image
              src={`${TMDB_IMAGE_BASE}/w92${p.logo_path}`}
              alt={p.provider_name}
              width={28}
              height={28}
              className="object-cover w-full h-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export async function StreamingProviders({
  tmdbId,
  type,
}: StreamingProvidersProps) {
  const countryCode = process.env.STREAMING_COUNTRY ?? "US";
  const providers = await getWatchProviders(tmdbId, type, countryCode);

  const streaming = providers?.flatrate ?? [];
  const free = [...(providers?.free ?? []), ...(providers?.ads ?? [])];
  const rent = providers?.rent ?? [];
  const buy = providers?.buy ?? [];

  if (
    streaming.length === 0 &&
    free.length === 0 &&
    rent.length === 0 &&
    buy.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <ProviderRow label="Stream" items={streaming} />
      <ProviderRow label="Free" items={free} />
      <ProviderRow label="Rent" items={rent} />
      <ProviderRow label="Buy" items={buy} />
      <p className="text-xs text-muted-foreground/60">
        Streaming availability via JustWatch
      </p>
    </div>
  );
}
