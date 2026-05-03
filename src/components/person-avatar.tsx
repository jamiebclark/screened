"use client";

import Image from "next/image";

interface PersonAvatarProps {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md" | "lg";
}

export function PersonAvatar({
  name,
  photoUrl,
  size = "md",
}: PersonAvatarProps) {
  const sizeClasses = {
    sm: "h-12 w-12 text-sm",
    md: "h-16 w-16 text-base",
    lg: "h-24 w-24 text-xl",
  };

  if (photoUrl) {
    return (
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-muted shrink-0`}
      >
        <Image src={photoUrl} alt={name} fill className="object-cover" />
      </div>
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary shrink-0`}
    >
      {initials}
    </div>
  );
}
