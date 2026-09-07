import { describe, expect, it } from "vitest";
import { parseListViewParams } from "./list-view-params";

describe("parseListViewParams", () => {
  it("falls back to date_added for an unknown sort value", () => {
    expect(
      parseListViewParams({ sort: "nonsense" }, { votingEnabled: true }).sort,
    ).toBe("date_added");
  });

  it("falls back to date_added for an absent sort value", () => {
    expect(parseListViewParams({}, { votingEnabled: true }).sort).toBe(
      "date_added",
    );
  });

  it("passes through a recognised sort value", () => {
    expect(
      parseListViewParams({ sort: "title" }, { votingEnabled: true }).sort,
    ).toBe("title");
  });

  it("falls back to date_added for votes when voting is not enabled", () => {
    expect(
      parseListViewParams({ sort: "votes" }, { votingEnabled: false }).sort,
    ).toBe("date_added");
  });

  it("allows votes when voting is enabled", () => {
    expect(
      parseListViewParams({ sort: "votes" }, { votingEnabled: true }).sort,
    ).toBe("votes");
  });

  it("resolves hidden=exclude to the exclude filter", () => {
    expect(
      parseListViewParams({ hidden: "exclude" }, { votingEnabled: true })
        .hiddenFilter,
    ).toBe("exclude");
  });

  it.each([undefined, "", "include", "garbage", "EXCLUDE"])(
    "resolves hidden=%s to the include filter",
    (hidden) => {
      expect(
        parseListViewParams({ hidden }, { votingEnabled: true }).hiddenFilter,
      ).toBe("include");
    },
  );
});
