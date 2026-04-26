"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Film, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PreferenceItem {
  id: string;
  type: "ATTRACTOR" | "REPELLER";
  weight: number;
  createdAt: Date;
  mediaItem: {
    id: string;
    tmdbId: number;
    title: string;
    poster: string | null;
    year: number | null;
  };
}

export function PreferencesSettings({ preferences }: { preferences: PreferenceItem[] }) {
  const [items, setItems] = useState(preferences);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/preferences?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const attractors = items.filter((p) => p.type === "ATTRACTOR");
  const repellers = items.filter((p) => p.type === "REPELLER");

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            No saved preferences yet. Use the Movie Night Picker and save films you always want to influence your recommendations.
          </p>
          <Button asChild>
            <Link href="/pick">Go to Picker</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {attractors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <h2 className="font-semibold text-sm">Like these ({attractors.length})</h2>
          </div>
          <div className="space-y-2">
            {attractors.map((pref) => (
              <PreferenceRow key={pref.id} pref={pref} onDelete={handleDelete} deleting={deleting} />
            ))}
          </div>
        </section>
      )}

      {repellers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <h2 className="font-semibold text-sm">Not like these ({repellers.length})</h2>
          </div>
          <div className="space-y-2">
            {repellers.map((pref) => (
              <PreferenceRow key={pref.id} pref={pref} onDelete={handleDelete} deleting={deleting} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PreferenceRow({
  pref,
  onDelete,
  deleting,
}: {
  pref: PreferenceItem;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  const weightLabel = pref.weight <= 0.5 ? "Soft" : pref.weight >= 2.0 ? "Strong" : "Normal";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {pref.mediaItem.poster ? (
        <Image
          src={`https://image.tmdb.org/t/p/w92${pref.mediaItem.poster}`}
          alt={pref.mediaItem.title}
          width={36}
          height={54}
          className="rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-9 h-14 rounded bg-muted shrink-0 flex items-center justify-center">
          <Film className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Link
          href={`/movies/${pref.mediaItem.tmdbId}`}
          className="text-sm font-medium hover:underline truncate block"
        >
          {pref.mediaItem.title}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          {pref.mediaItem.year && (
            <span className="text-xs text-muted-foreground">{pref.mediaItem.year}</span>
          )}
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {weightLabel}
          </Badge>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(pref.id)}
        disabled={deleting === pref.id}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        {deleting === pref.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
