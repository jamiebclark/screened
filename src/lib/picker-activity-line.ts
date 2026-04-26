import type { PickerRoomState } from "./picker-room-state";

type Participant = PickerRoomState["participants"][number];

function labelFor(people: Participant[], id: string, youId: string): string {
  if (id === youId) return "You";
  const p = people.find((u) => u.id === id);
  if (p) {
    const n = p.name?.trim();
    if (n) return n;
    if (p.email) return p.email.split("@")[0] ?? p.email;
  }
  return "Someone";
}

/** Names for participants who may no longer be in `next` (e.g. removed) or the actor. */
function rosterForLabels(prev: PickerRoomState, next: PickerRoomState): Participant[] {
  const m = new Map<string, Participant>();
  for (const p of next.participants) m.set(p.id, p);
  for (const p of prev.participants) {
    if (!m.has(p.id)) m.set(p.id, p);
  }
  return [...m.values()];
}

/**
 * A single user-visible line for a state transition, attributed to `actorId` (the PATCH author).
 */
export function describePickerStateChange(
  prev: PickerRoomState,
  next: PickerRoomState,
  { actorId, youId }: { actorId: string; youId: string }
): string | null {
  const roster = rosterForLabels(prev, next);

  // 1) Scoring lifecycle (most salient)
  if (!prev.scoringInProgress && next.scoringInProgress) {
    return `${labelFor(roster, actorId, youId)} started a new search.`;
  }
  if (prev.scoringInProgress && !next.scoringInProgress) {
    if (next.scoringError) {
      const e = next.scoringError;
      const short = e.length > 100 ? `${e.slice(0, 97)}…` : e;
      const who = labelFor(roster, actorId, youId);
      const prefix = who === "You" ? "Your search failed" : `${who}'s search failed`;
      return `${prefix}: ${short}`;
    }
    if (next.scoringResults) {
      const n = next.scoringResults.length;
      if (n === 0) {
        return `${labelFor(roster, actorId, youId)} got no new suggestions this run.`;
      }
      return `${labelFor(roster, actorId, youId)} updated the ranked list (${n} ${
        n === 1 ? "title" : "titles"
      }).`;
    }
  }

  const prevIds = new Set(prev.participants.map((x) => x.id));
  const nextIds = new Set(next.participants.map((x) => x.id));

  // 2) Participants
  for (const id of nextIds) {
    if (prevIds.has(id)) continue;
    if (id === actorId) {
      return `${labelFor(roster, id, youId)} joined the session.`;
    }
    return `${labelFor(roster, actorId, youId)} added ${labelFor(roster, id, youId)} to the session.`;
  }
  for (const id of prevIds) {
    if (nextIds.has(id)) continue;
    if (id === actorId) {
      return `${labelFor(roster, id, youId)} left the session.`;
    }
    return `${labelFor(roster, actorId, youId)} removed ${labelFor(roster, id, youId)} from the session.`;
  }

  // 3) Like / not-like lists
  const aPrev = new Map(prev.attractors.map((m) => [m.mediaItemId, m]));
  const aNext = new Map(next.attractors.map((m) => [m.mediaItemId, m]));
  for (const m of next.attractors) {
    if (!aPrev.has(m.mediaItemId)) {
      return `${labelFor(roster, actorId, youId)} added “${m.title}” to Like these.`;
    }
  }
  for (const m of prev.attractors) {
    if (!aNext.has(m.mediaItemId)) {
      return `${labelFor(roster, actorId, youId)} removed “${m.title}” from Like these.`;
    }
  }

  const rPrev = new Map(prev.repellers.map((m) => [m.mediaItemId, m]));
  const rNext = new Map(next.repellers.map((m) => [m.mediaItemId, m]));
  for (const m of next.repellers) {
    if (!rPrev.has(m.mediaItemId)) {
      return `${labelFor(roster, actorId, youId)} added “${m.title}” to Not like these.`;
    }
  }
  for (const m of prev.repellers) {
    if (!rNext.has(m.mediaItemId)) {
      return `${labelFor(roster, actorId, youId)} removed “${m.title}” from Not like these.`;
    }
  }

  // 4) Veto (dismiss from results)
  const vPrev = new Set(prev.vetoIds);
  const vNext = new Set(next.vetoIds);
  for (const id of vNext) {
    if (vPrev.has(id)) continue;
    return `${labelFor(roster, actorId, youId)} moved a result to Not like these.`;
  }
  for (const id of vPrev) {
    if (vNext.has(id)) continue;
    return `${labelFor(roster, actorId, youId)} took a title off the not-for-tonight list.`;
  }

  // 5) Search filters
  if (
    prev.minYear !== next.minYear ||
    prev.maxYear !== next.maxYear ||
    prev.maxRuntime !== next.maxRuntime ||
    prev.plexLibraryOnly !== next.plexLibraryOnly ||
    prev.hideAllLogged !== next.hideAllLogged
  ) {
    return `${labelFor(roster, actorId, youId)} changed search or library filters.`;
  }
  if (JSON.stringify(prev.requirePeople) !== JSON.stringify(next.requirePeople)) {
    return `${labelFor(roster, actorId, youId)} changed required cast/crew.`;
  }
  if (JSON.stringify(prev.excludePeople) !== JSON.stringify(next.excludePeople)) {
    return `${labelFor(roster, actorId, youId)} changed excluded cast/crew.`;
  }
  if (prev.filtersOpen !== next.filtersOpen) {
    return `${labelFor(roster, actorId, youId)} ${next.filtersOpen ? "opened" : "collapsed"} the filters.`;
  }

  // Reference weights (saved toggles are often paired with other edits; this catches weight-only nudges)
  for (const m of prev.attractors) {
    const o = aNext.get(m.mediaItemId);
    if (o && o.weight !== m.weight) {
      return `${labelFor(roster, actorId, youId)} changed reference weights.`;
    }
  }
  for (const m of prev.repellers) {
    const o = rNext.get(m.mediaItemId);
    if (o && o.weight !== m.weight) {
      return `${labelFor(roster, actorId, youId)} changed reference weights.`;
    }
  }

  return null;
}
