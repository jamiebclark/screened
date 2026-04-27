import { describe, it, expect } from "vitest";
import {
  computePickerScoreFingerprint,
  hydratePickerFingerprintIfNeeded,
} from "./picker-score-fingerprint";
import type { PickerRoomState } from "./picker-room-state";

const u = {
  id: "u1",
  name: "A",
  email: "a@a.com",
  avatarUrl: null as string | null,
};

function base(over: Partial<PickerRoomState> = {}): PickerRoomState {
  return {
    participants: [u],
    attractors: [],
    repellers: [],
    minYear: "",
    maxYear: "",
    maxRuntime: "",
    requirePeople: [],
    excludePeople: [],
    includeGenres: [],
    excludeGenres: [],
    vetoIds: [],
    plexLibraryOnly: false,
    hideAllLogged: false,
    filtersOpen: true,
    scoringInProgress: false,
    scoringError: null,
    scoringResults: null,
    lastScoreFingerprint: null,
    filterAttribution: {},
    filterFieldEditors: {},
    ...over,
  };
}

describe("computePickerScoreFingerprint", () => {
  it("is stable for equivalent criteria", () => {
    const a = base({
      attractors: [
        {
          mediaItemId: "m1",
          tmdbId: 1,
          title: "T",
          poster: null,
          year: 2000,
          weight: 1,
          saved: false,
          hasEmbedding: true,
          genres: [],
        },
      ],
    });
    const b = base({
      attractors: [
        {
          mediaItemId: "m1",
          tmdbId: 99,
          title: "Other",
          poster: "/x",
          year: 1999,
          weight: 1,
          saved: true,
          hasEmbedding: false,
          genres: ["Drama"],
        },
      ],
    });
    expect(computePickerScoreFingerprint(a)).toBe(
      computePickerScoreFingerprint(b),
    );
  });

  it("changes when weight changes", () => {
    const a = base({
      attractors: [
        {
          mediaItemId: "m1",
          tmdbId: 1,
          title: "T",
          poster: null,
          year: null,
          weight: 1,
          saved: false,
          hasEmbedding: true,
          genres: [],
        },
      ],
    });
    const b = base({
      attractors: [
        {
          mediaItemId: "m1",
          tmdbId: 1,
          title: "T",
          poster: null,
          year: null,
          weight: 2,
          saved: false,
          hasEmbedding: true,
          genres: [],
        },
      ],
    });
    expect(computePickerScoreFingerprint(a)).not.toBe(
      computePickerScoreFingerprint(b),
    );
  });

  it("ignores scoringResults and scoringInProgress", () => {
    const a = base({ scoringResults: [], scoringInProgress: true });
    const b = base({ scoringResults: null, scoringInProgress: false });
    expect(computePickerScoreFingerprint(a)).toBe(
      computePickerScoreFingerprint(b),
    );
  });
});

describe("hydratePickerFingerprintIfNeeded", () => {
  it("fills lastScoreFingerprint when results exist and fp is null", () => {
    const s = base({
      scoringResults: [
        {
          id: "x",
          tmdbId: 1,
          title: "T",
          poster: null,
          year: 2000,
          runtime: 90,
          genres: [],
          overview: null,
          cast: [],
          director: null,
          score: 1,
          attractorScore: 1,
          repellerScore: 0,
        },
      ],
      lastScoreFingerprint: null,
    });
    const h = hydratePickerFingerprintIfNeeded(s);
    expect(h.lastScoreFingerprint).toBe(computePickerScoreFingerprint(s));
  });

  it("no-ops when fingerprint already set", () => {
    const s = base({ lastScoreFingerprint: "abc" });
    expect(hydratePickerFingerprintIfNeeded(s)).toBe(s);
  });
});
