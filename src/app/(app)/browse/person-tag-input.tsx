"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PersonFilterItem } from "@/lib/browse-types";

interface PersonSuggestion {
  id: number;
  name: string;
  role: string | null;
  profile: string | null;
}

interface PersonTagInputProps {
  label: string;
  persons: PersonFilterItem[];
  maxCount: number;
  onChange: (persons: PersonFilterItem[]) => void;
}

export function PersonTagInput({
  label,
  persons,
  maxCount,
  onChange,
}: PersonTagInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search/person?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { results: PersonSuggestion[] };
      setSuggestions(data.results);
      setOpen(data.results.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(suggestion: PersonSuggestion) {
    if (persons.some((p) => p.id === suggestion.id)) return;
    onChange([...persons, { id: suggestion.id, name: suggestion.name }]);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  }

  function handleRemove(id: number) {
    onChange(persons.filter((p) => p.id !== id));
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const atMax = persons.length >= maxCount;

  return (
    <div ref={containerRef} className="space-y-1.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>

      {/* Chips */}
      {persons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {persons.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 ring-1 ring-ring"
            >
              {p.name}
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!atMax && (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Type a name…"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {isLoading && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              …
            </span>
          )}

          {open && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md py-1 max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                  >
                    {s.profile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.profile}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-muted shrink-0" />
                    )}
                    <span className="flex-1 truncate">{s.name}</span>
                    {s.role && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {s.role}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {suggestions.length === 0 && !isLoading && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No matches found
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      {atMax && (
        <p className="text-xs text-muted-foreground">
          Maximum {maxCount} {label.toLowerCase()} reached
        </p>
      )}
    </div>
  );
}
