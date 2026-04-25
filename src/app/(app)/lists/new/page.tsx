"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewListPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      isPublic: form.get("visibility") !== "private",
    };

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to create list");
        setLoading(false);
        return;
      }

      const list = await res.json() as { slug: string };
      router.push(`/lists/${list.slug}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-full bg-primary/10 p-3">
          <ListVideo className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">New list</h1>
          <p className="text-muted-foreground text-sm">Create a collaborative movie list</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">List name</Label>
              <Input id="name" name="name" required placeholder="e.g. Friday Night Movies" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's this list for?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "public", label: "Public", desc: "Anyone can view" },
                  { value: "private", label: "Private", desc: "Only members" },
                ].map(({ value, label, desc }) => (
                  <label key={value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      defaultChecked={value === "public"}
                      className="peer sr-only"
                    />
                    <div className="rounded-lg border border-border bg-muted p-3 peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create list
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
