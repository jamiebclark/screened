import { describe, expect, it } from "vitest";
import {
  challengeWindowBounds,
  describeChallengeWindow,
  hasChallengeWindow,
  isWithinChallengeWindow,
  parseChallengeWindowInput,
  type ChallengeWindow,
} from "./list-challenge-window";

const NO_WINDOW: ChallengeWindow = { startsAt: null, endsAt: null };

describe("parseChallengeWindowInput", () => {
  it("accepts a YYYY-MM-DD date for either field", () => {
    const result = parseChallengeWindowInput(
      { challengeStartsAt: "2026-09-01" },
      NO_WINDOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startsAt).toEqual(
        new Date(Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
      );
    }
  });

  it("accepts a full ISO datetime, normalizing to the UTC day start", () => {
    const result = parseChallengeWindowInput(
      { challengeEndsAt: "2026-10-31T23:59:59.000Z" },
      NO_WINDOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.endsAt).toEqual(
        new Date(Date.UTC(2026, 9, 31, 0, 0, 0, 0)),
      );
    }
  });

  it("accepts an explicit null, clearing the field", () => {
    const current: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: new Date(Date.UTC(2026, 9, 31)),
    };
    const result = parseChallengeWindowInput(
      { challengeStartsAt: null },
      current,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startsAt).toBeNull();
      expect(result.value.endsAt).toEqual(current.endsAt);
    }
  });

  it("leaves a field absent from the input untouched", () => {
    const current: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: null,
    };
    const result = parseChallengeWindowInput({}, current);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(current);
    }
  });

  it("rejects a non-date string", () => {
    const result = parseChallengeWindowInput(
      { challengeStartsAt: "soon" },
      NO_WINDOW,
    );
    expect(result).toEqual({
      ok: false,
      error: "Challenge dates must be calendar dates",
    });
  });

  it("rejects a non-string value", () => {
    const result = parseChallengeWindowInput(
      { challengeStartsAt: 12345 },
      NO_WINDOW,
    );
    expect(result).toEqual({
      ok: false,
      error: "Challenge dates must be calendar dates",
    });
  });

  it("rejects an end earlier than the effective post-merge start", () => {
    const current: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: null,
    };
    const result = parseChallengeWindowInput(
      { challengeEndsAt: "2026-09-01" },
      current,
    );
    expect(result.ok).toBe(true);

    const rejected = parseChallengeWindowInput(
      { challengeEndsAt: "2026-08-31" },
      current,
    );
    expect(rejected).toEqual({
      ok: false,
      error: "Challenge end date cannot be before the start date",
    });
  });

  it("compares against the effective (merged) window when only one field is sent", () => {
    const current: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: new Date(Date.UTC(2026, 9, 31)),
    };
    // Sending a new start after the stored end should be rejected.
    const result = parseChallengeWindowInput(
      { challengeStartsAt: "2026-11-01" },
      current,
    );
    expect(result).toEqual({
      ok: false,
      error: "Challenge end date cannot be before the start date",
    });
  });
});

describe("challengeWindowBounds", () => {
  it("returns null when both ends are null", () => {
    expect(challengeWindowBounds(NO_WINDOW)).toBeNull();
  });

  it("produces only a gte bound when only startsAt is set", () => {
    const window: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: null,
    };
    expect(challengeWindowBounds(window)).toEqual({
      gte: new Date(Date.UTC(2026, 8, 1)),
    });
  });

  it("expands endsAt via utcDayEndExclusive as a lt bound", () => {
    const window: ChallengeWindow = {
      startsAt: null,
      endsAt: new Date(Date.UTC(2026, 9, 31)),
    };
    expect(challengeWindowBounds(window)).toEqual({
      lt: new Date(Date.UTC(2026, 10, 1)),
    });
  });

  it("produces both bounds when both ends are set", () => {
    const window: ChallengeWindow = {
      startsAt: new Date(Date.UTC(2026, 8, 1)),
      endsAt: new Date(Date.UTC(2026, 9, 31)),
    };
    expect(challengeWindowBounds(window)).toEqual({
      gte: new Date(Date.UTC(2026, 8, 1)),
      lt: new Date(Date.UTC(2026, 10, 1)),
    });
  });
});

describe("hasChallengeWindow", () => {
  it("is false when both ends are null", () => {
    expect(hasChallengeWindow(NO_WINDOW)).toBe(false);
  });

  it("is true when either end is set", () => {
    expect(hasChallengeWindow({ startsAt: new Date(), endsAt: null })).toBe(
      true,
    );
    expect(hasChallengeWindow({ startsAt: null, endsAt: new Date() })).toBe(
      true,
    );
  });
});

describe("isWithinChallengeWindow", () => {
  const window: ChallengeWindow = {
    startsAt: new Date(Date.UTC(2026, 8, 1)),
    endsAt: new Date(Date.UTC(2026, 9, 31)),
  };

  it("is inclusive of the start boundary", () => {
    expect(
      isWithinChallengeWindow(new Date(Date.UTC(2026, 8, 1)), window),
    ).toBe(true);
  });

  it("is inclusive of the end boundary (end of that calendar day)", () => {
    expect(
      isWithinChallengeWindow(
        new Date(Date.UTC(2026, 9, 31, 23, 59, 59)),
        window,
      ),
    ).toBe(true);
  });

  it("excludes a date before the start", () => {
    expect(
      isWithinChallengeWindow(new Date(Date.UTC(2026, 7, 31)), window),
    ).toBe(false);
  });

  it("excludes a date on/after the day following the end", () => {
    expect(
      isWithinChallengeWindow(new Date(Date.UTC(2026, 10, 1)), window),
    ).toBe(false);
  });

  it("is true for any date when there is no window", () => {
    expect(
      isWithinChallengeWindow(new Date(Date.UTC(1999, 0, 1)), NO_WINDOW),
    ).toBe(true);
  });
});

describe("describeChallengeWindow", () => {
  it("renders both ends as a range", () => {
    expect(
      describeChallengeWindow({
        startsAt: new Date(Date.UTC(2026, 8, 1)),
        endsAt: new Date(Date.UTC(2026, 9, 31)),
      }),
    ).toBe("1 Sep – 31 Oct 2026");
  });

  it("renders a start-only window", () => {
    expect(
      describeChallengeWindow({
        startsAt: new Date(Date.UTC(2026, 8, 1)),
        endsAt: null,
      }),
    ).toBe("From 1 Sep 2026");
  });

  it("renders an end-only window", () => {
    expect(
      describeChallengeWindow({
        startsAt: null,
        endsAt: new Date(Date.UTC(2026, 9, 31)),
      }),
    ).toBe("Up to 31 Oct 2026");
  });

  it("renders null when there is no window", () => {
    expect(describeChallengeWindow(NO_WINDOW)).toBeNull();
  });
});
