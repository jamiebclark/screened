import { describe, it, expect } from "vitest";
import { describePickerStateChange } from "./picker-activity-line";
import type {
  PickerRoomState,
  ReferenceMovieJson,
  ScoredMovieJson,
} from "./picker-room-state";

const pat = {
  id: "p1",
  name: "Pat",
  email: "pat@example.com",
  avatarUrl: null as string | null,
};
const alex = {
  id: "a1",
  name: "Alex",
  email: "alex@example.com",
  avatarUrl: null as string | null,
};
const morgan = {
  id: "m1",
  name: "Morgan",
  email: "morgan@example.com",
  avatarUrl: null as string | null,
};

function ref(
  over: Partial<ReferenceMovieJson> & { mediaItemId: string; title: string },
): ReferenceMovieJson {
  return {
    tmdbId: 1,
    poster: null,
    year: 2020,
    weight: 1,
    saved: false,
    hasEmbedding: true,
    genres: [],
    ...over,
  };
}

const scored: ScoredMovieJson = {
  id: "sm1",
  tmdbId: 99,
  title: "Scored",
  poster: null,
  year: 2019,
  runtime: 100,
  genres: [],
  overview: null,
  cast: [],
  director: null,
  score: 0.5,
  attractorScore: 0.5,
  repellerScore: 0.1,
};

function base(over: Partial<PickerRoomState> = {}): PickerRoomState {
  return {
    participants: [pat],
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

describe("describePickerStateChange", () => {
  it("returns null when nothing meaningful changes", () => {
    const s = base();
    expect(
      describePickerStateChange(
        s,
        { ...s, participants: [...s.participants] },
        { actorId: "p1", youId: "p1" },
      ),
    ).toBe(null);
  });

  it("scoring: started", () => {
    const prev = base({ participants: [pat, alex] });
    const next = {
      ...prev,
      scoringInProgress: true,
      scoringError: null,
      scoringResults: null,
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "a1", youId: "p1" }),
    ).toBe("Alex started a new search.");
  });

  it("scoring: started — You when actor is viewer", () => {
    const prev = base();
    const next = {
      ...prev,
      scoringInProgress: true,
      scoringError: null,
      scoringResults: null,
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You started a new search.");
  });

  it("scoring: failed with message (yours vs theirs)", () => {
    const prev = { ...base(), scoringInProgress: true };
    const next = {
      ...prev,
      scoringInProgress: false,
      scoringError: "Boom",
      scoringResults: null,
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("Your search failed: Boom");
    expect(
      describePickerStateChange(
        prev,
        { ...next, participants: [pat, alex] },
        { actorId: "a1", youId: "p1" },
      ),
    ).toBe("Alex's search failed: Boom");
  });

  it("scoring: long error is truncated at 100 chars", () => {
    const err = "x".repeat(120);
    const prev = { ...base(), scoringInProgress: true };
    const next = {
      ...prev,
      scoringInProgress: false,
      scoringError: err,
      scoringResults: null,
    };
    const out = describePickerStateChange(prev, next, {
      actorId: "p1",
      youId: "p1",
    });
    expect(out).toContain("…");
    expect(out!.length).toBeLessThan(130);
  });

  it("scoring: success with one title", () => {
    const prev = { ...base(), scoringInProgress: true };
    const next = {
      ...prev,
      scoringInProgress: false,
      scoringError: null,
      scoringResults: [scored],
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "m1" }),
    ).toBe("Pat updated the ranked list (1 title).");
  });

  it("scoring: success with two titles", () => {
    const prev = { ...base(), scoringInProgress: true };
    const next = {
      ...prev,
      scoringInProgress: false,
      scoringError: null,
      scoringResults: [
        scored,
        { ...scored, id: "sm2", tmdbId: 98, title: "Other" },
      ],
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "m1" }),
    ).toBe("Pat updated the ranked list (2 titles).");
  });

  it("scoring: success with zero results", () => {
    const prev = {
      ...base({ participants: [pat, alex] }),
      scoringInProgress: true,
    };
    const next = {
      ...prev,
      scoringInProgress: false,
      scoringError: null,
      scoringResults: [],
    };
    expect(
      describePickerStateChange(prev, next, { actorId: "a1", youId: "p1" }),
    ).toBe("Alex got no new suggestions this run.");
  });

  it("participant: you added another user", () => {
    const prev2 = base({ participants: [pat, alex] });
    const next2 = { ...prev2, participants: [pat, alex, morgan] };
    expect(
      describePickerStateChange(prev2, next2, { actorId: "p1", youId: "p1" }),
    ).toBe("You added Morgan to the session.");
  });

  it("participant: someone joined (new id is actorId)", () => {
    const prev2 = base({ participants: [pat] });
    const next2 = { ...prev2, participants: [pat, alex] };
    expect(
      describePickerStateChange(prev2, next2, { actorId: "a1", youId: "p1" }),
    ).toBe("Alex joined the session.");
  });

  it("participant: host removed someone", () => {
    const prev2 = base({ participants: [pat, alex] });
    const next2 = { ...prev2, participants: [pat] };
    expect(
      describePickerStateChange(prev2, next2, { actorId: "p1", youId: "p1" }),
    ).toBe("You removed Alex from the session.");
  });

  it("attractor: added (uses curly quotes in copy)", () => {
    const f = ref({ mediaItemId: "mid1", title: "Inception" });
    const prev = base();
    const next = { ...prev, attractors: [f] };
    const line = describePickerStateChange(prev, next, {
      actorId: "p1",
      youId: "p1",
    });
    expect(line).toContain("Inception");
    expect(line).toContain("Like these");
  });

  it("attractor: removed", () => {
    const f = ref({ mediaItemId: "mid1", title: "Gone" });
    const prev = base({ attractors: [f] });
    const next = { ...prev, attractors: [] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toContain("removed");
  });

  it("repeller: added", () => {
    const f = ref({ mediaItemId: "r1", title: "Bad" });
    const prev = base();
    const next = { ...prev, repellers: [f] };
    expect(
      describePickerStateChange(prev, next, { actorId: "m1", youId: "m1" }),
    ).toBe("You added “Bad” to Not like these.");
  });

  it("veto: new veto id", () => {
    const prev = base({ vetoIds: [] });
    const next = { ...prev, vetoIds: ["v1"] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You moved a result to Not like these.");
  });

  it("veto + repeller add (dismiss from results) prefers veto line", () => {
    const r = ref({ mediaItemId: "v1", title: "Nope" });
    const prev = base({ vetoIds: [], repellers: [] });
    const next = { ...prev, vetoIds: ["v1"], repellers: [r] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You moved a result to Not like these.");
  });

  it("veto: removed from veto", () => {
    const prev = base({ vetoIds: ["v1"] });
    const next = { ...prev, vetoIds: [] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You took a title off the not-for-tonight list.");
  });

  it("filters: year change", () => {
    const prev = base();
    const next = { ...prev, minYear: "2000" };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You changed search or library filters.");
  });

  it("requirePeople change", () => {
    const prev = base();
    const next = { ...prev, requirePeople: ["nolan"] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You changed required cast/crew.");
  });

  it("includeGenres change", () => {
    const prev = base();
    const next = { ...prev, includeGenres: ["Comedy"] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You changed included genres.");
  });

  it("excludeGenres change", () => {
    const prev = base();
    const next = { ...prev, excludeGenres: ["Horror"] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You changed excluded genres.");
  });

  it("filtersOpen toggles", () => {
    const prev = base({ filtersOpen: true });
    const next = { ...prev, filtersOpen: false };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You collapsed the filters.");
  });

  it("weight change on same attractor", () => {
    const f1 = ref({ mediaItemId: "mid1", title: "W", weight: 1 });
    const f2 = { ...f1, weight: 0.5 };
    const prev = base({ attractors: [f1] });
    const next = { ...prev, attractors: [f2] };
    expect(
      describePickerStateChange(prev, next, { actorId: "p1", youId: "p1" }),
    ).toBe("You changed reference weights.");
  });
});
