"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import Image from "next/image";

export function TrailerEmbed({
  youtubeKey,
  title,
}: {
  youtubeKey: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="mt-6 space-y-3">
      <h3 className="text-base font-semibold">Trailer</h3>
      <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1`}
            title={`${title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 w-full h-full flex items-center justify-center"
            aria-label={`Play ${title} trailer`}
          >
            <Image
              src={`https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`}
              alt={`${title} trailer thumbnail`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:scale-105 transition-transform">
              <Play className="h-7 w-7 fill-black text-black translate-x-0.5" />
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
