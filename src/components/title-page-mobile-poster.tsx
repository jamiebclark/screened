import Image from "next/image";

type Props = {
  posterUrl: string | null;
  title: string;
};

/**
 * Thumbnail for narrow viewports; large poster remains in the side column from `sm` up.
 * Decorative when `posterUrl` is set (title is in the adjacent `h1`).
 */
export function TitlePageMobilePoster({ posterUrl, title }: Props) {
  return (
    <div className="w-20 shrink-0 sm:hidden">
      {posterUrl ? (
        <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border shadow-md">
          <Image
            src={posterUrl}
            alt=""
            width={80}
            height={120}
            className="h-full w-full object-cover"
            sizes="80px"
          />
        </div>
      ) : (
        <div className="flex aspect-[2/3] items-center justify-center rounded-lg border border-border bg-muted p-1 text-center text-[10px] text-muted-foreground leading-tight">
          {title}
        </div>
      )}
    </div>
  );
}
