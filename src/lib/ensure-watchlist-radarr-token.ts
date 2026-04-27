import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

/** Ensures the user has a Radarr export token; creates one on first use (e.g. legacy accounts). */
export async function ensureWatchlistRadarrToken(
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { watchlistRadarrToken: true },
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (user.watchlistRadarrToken) {
    return user.watchlistRadarrToken;
  }
  const token = generateToken(24);
  await prisma.user.update({
    where: { id: userId },
    data: { watchlistRadarrToken: token },
  });
  return token;
}
