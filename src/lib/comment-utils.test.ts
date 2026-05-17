import { describe, expect, it } from "vitest";
import { computeUnreadCommentCount } from "./comment-utils";

function d(iso: string) {
  return new Date(iso);
}

describe("computeUnreadCommentCount", () => {
  it("returns total count when lastReadAt is null (never opened)", () => {
    const comments = [
      { createdAt: d("2024-01-01T10:00:00Z") },
      { createdAt: d("2024-01-02T10:00:00Z") },
    ];
    expect(computeUnreadCommentCount(comments, null)).toBe(2);
  });

  it("returns 0 when there are no comments", () => {
    expect(computeUnreadCommentCount([], null)).toBe(0);
    expect(computeUnreadCommentCount([], d("2024-01-01T00:00:00Z"))).toBe(0);
  });

  it("returns 0 when all comments are before lastReadAt", () => {
    const comments = [
      { createdAt: d("2024-01-01T10:00:00Z") },
      { createdAt: d("2024-01-02T10:00:00Z") },
    ];
    expect(computeUnreadCommentCount(comments, d("2024-01-03T00:00:00Z"))).toBe(
      0,
    );
  });

  it("returns only comments strictly after lastReadAt", () => {
    const comments = [
      { createdAt: d("2024-01-01T10:00:00Z") },
      { createdAt: d("2024-01-03T10:00:00Z") },
      { createdAt: d("2024-01-05T10:00:00Z") },
    ];
    expect(computeUnreadCommentCount(comments, d("2024-01-02T00:00:00Z"))).toBe(
      2,
    );
  });

  it("excludes a comment exactly at lastReadAt (not strictly after)", () => {
    const ts = "2024-01-02T10:00:00Z";
    const comments = [{ createdAt: d(ts) }];
    expect(computeUnreadCommentCount(comments, d(ts))).toBe(0);
  });

  it("counts all as unread when lastReadAt predates all comments", () => {
    const comments = [
      { createdAt: d("2024-06-01T00:00:00Z") },
      { createdAt: d("2024-06-02T00:00:00Z") },
      { createdAt: d("2024-06-03T00:00:00Z") },
    ];
    expect(computeUnreadCommentCount(comments, d("2024-01-01T00:00:00Z"))).toBe(
      3,
    );
  });
});
