import { auth } from "@/lib/auth";
import { ensureCalendarToken } from "@/lib/ensure-calendar-token";
import { CalendarSettings } from "./calendar-settings";

export const metadata = { title: "Calendar Feed" };

export default async function CalendarSettingsPage() {
  const session = await auth();
  const token = await ensureCalendarToken(session!.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/api/calendar/feed?token=${token}`;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Calendar Feed</h1>
      <p className="text-muted-foreground mb-8">
        Export your watchlist release dates to any calendar app.
      </p>
      <CalendarSettings initialUrl={url} />
    </div>
  );
}
