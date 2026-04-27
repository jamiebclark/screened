"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PickerActivityProps {
  activityLines: Array<{ id: string; text: string; at: number }>;
  roomId: string | null;
}

export function PickerActivity({ activityLines, roomId }: PickerActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Session</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Who ran a search, changed criteria, or edited the list—newest first.
          Others appear when the room is shared; your own runs also show as
          &quot;You&quot; on this device.
        </p>
      </CardHeader>
      <CardContent
        className="space-y-2"
        role="region"
        aria-label="Session activity"
      >
        {activityLines.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {roomId
              ? "No events yet. When a participant edits or runs the picker, a line will show here."
              : "Start a shared room and open the same link to see what each person does in real time."}
          </p>
        ) : (
          <ul className="max-h-64 list-none space-y-2 overflow-y-auto pl-0 pr-1 text-xs leading-snug">
            {activityLines.map((row) => (
              <li key={row.id} className="text-foreground/90">
                {row.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
