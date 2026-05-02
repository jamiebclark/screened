import Link from "next/link";
import Image from "next/image";
import { Globe, Lock, ListVideo, Users } from "lucide-react";
import { tmdbImageUrl } from "@/lib/utils";

export type ListCardData = {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  description: string | null;
  items: Array<{ mediaItem: { poster: string | null; title: string } }>;
  _count: { items: number; members: number };
};

export function ListCard({ list }: { list: ListCardData }) {
  return (
    <Link
      href={`/lists/${list.slug}`}
      className="block rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-200 overflow-hidden group"
    >
      <div className="h-24 bg-muted flex overflow-hidden">
        {list.items.slice(0, 4).map((item, i) => {
          const url = tmdbImageUrl(item.mediaItem.poster, "w185");
          return (
            <div key={i} className="flex-1 relative overflow-hidden">
              {url ? (
                <Image
                  src={url}
                  alt={item.mediaItem.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
        {list.items.length === 0 && (
          <div className="w-full flex items-center justify-center">
            <ListVideo className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {list.name}
          </h3>
          {list.isPublic ? (
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>
        {list.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {list.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {list._count.items} items
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {list._count.members}
          </span>
        </div>
      </div>
    </Link>
  );
}
