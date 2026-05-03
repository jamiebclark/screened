import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

export async function ensureCalendarToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarToken: true },
  });
  if (!user) throw new Error("User not found");
  if (user.calendarToken) return user.calendarToken;
  const token = generateToken(24);
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: token },
  });
  return token;
}
