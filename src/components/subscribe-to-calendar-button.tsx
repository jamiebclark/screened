"use client";

import { useState } from "react";
import { CalendarPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SubscribeToCalendarButton({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  const copyFeedUrl = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <CalendarPlus className="h-3.5 w-3.5" />
          Subscribe to Calendar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium mb-1">Live calendar subscription</p>
        <p className="text-xs text-muted-foreground mb-3">
          Subscribe once and your calendar stays in sync — new parties and
          releases are added automatically.
        </p>
        <div className="space-y-2">
          <Button size="sm" className="w-full gap-1.5" asChild>
            <a href={webcalUrl}>
              <CalendarPlus className="h-3.5 w-3.5" />
              Subscribe (Apple / Outlook)
            </a>
          </Button>
          <div className="flex gap-1.5">
            <Input
              readOnly
              value={feedUrl}
              className="font-mono text-xs h-8"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={copyFeedUrl}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For Google Calendar: Other calendars → From URL → paste above.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
