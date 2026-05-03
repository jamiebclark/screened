"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

type State = "idle" | "running" | "success" | "error";

export function TriggerCronButton({ integration }: { integration: string }) {
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setState("running");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/cron-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration }),
      });
      if (res.ok) {
        setState("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data?.error ?? `HTTP ${res.status}`);
        setState("error");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleClick}
      disabled={state === "running"}
      title={state === "error" && errorMessage ? errorMessage : "Run now"}
    >
      {state === "idle" && <Play className="h-3.5 w-3.5" />}
      {state === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === "success" && (
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      )}
      {state === "error" && (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      )}
    </Button>
  );
}
