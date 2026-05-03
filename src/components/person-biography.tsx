"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type PersonBiographyProps = {
  text: string;
};

/** Heuristic: when clamp may hide content, offer expand/collapse. */
function likelyTruncated(text: string): boolean {
  const t = text.trim();
  if (t.length > 160) return true;
  return t.split(/\n/).filter(Boolean).length >= 3;
}

export function PersonBiography({ text }: PersonBiographyProps) {
  const bodyId = useId();
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const showToggle = useMemo(() => likelyTruncated(trimmed), [trimmed]);

  if (!trimmed) return null;

  return (
    <div className="text-sm text-muted-foreground leading-relaxed">
      <p
        id={bodyId}
        className={
          expanded ? "whitespace-pre-wrap" : "line-clamp-6 whitespace-pre-wrap"
        }
      >
        {trimmed}
      </p>
      {showToggle ? (
        <Button
          type="button"
          variant="link"
          className="mt-1.5 h-auto p-0 text-xs font-medium"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          {expanded ? "Show less" : "Read full biography"}
        </Button>
      ) : null}
    </div>
  );
}
