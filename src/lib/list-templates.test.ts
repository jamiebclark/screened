import { describe, it, expect } from "vitest";
import { TAG_MAX_LENGTH, validateTagName } from "./list-item-tags";
import { LIST_PRESETS } from "./list-presets";
import {
  LIST_TEMPLATES,
  LIST_TEMPLATE_IDS,
  LIST_TEMPLATE_LIST,
  getListTemplate,
  isListTemplateId,
  listTemplateChallengeWindow,
  listTemplateFlags,
  listTemplateTagRows,
} from "./list-templates";

describe("LIST_TEMPLATES", () => {
  it("keys each template by its own id", () => {
    for (const id of LIST_TEMPLATE_IDS) {
      expect(LIST_TEMPLATES[id].id).toBe(id);
    }
  });

  it("exposes every template in the ordered list", () => {
    expect(LIST_TEMPLATE_LIST.map((t) => t.id)).toEqual([...LIST_TEMPLATE_IDS]);
  });

  it("gives every template a name to prefill", () => {
    for (const template of LIST_TEMPLATE_LIST) {
      expect(template.defaultName.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("template tags", () => {
  it("keeps every shipped tag label valid and within the length limit", () => {
    for (const template of LIST_TEMPLATE_LIST) {
      for (const label of template.tags) {
        expect(validateTagName(label), label).toMatchObject({ ok: true });
        expect(label.length, label).toBeLessThanOrEqual(TAG_MAX_LENGTH);
      }
    }
  });

  it("declares no duplicate categories, so a create can't hit the unique index", () => {
    for (const template of LIST_TEMPLATE_LIST) {
      const rows = listTemplateTagRows(template);
      expect(rows).toHaveLength(template.tags.length);
      expect(new Set(rows.map((r) => r.normalized)).size).toBe(rows.length);
    }
  });

  it("returns display labels untouched alongside comparison keys", () => {
    const rows = listTemplateTagRows(LIST_TEMPLATES["hooptober-2026"]);
    expect(rows).toContainEqual({
      label: '"Massacre" in the title',
      normalized: '"massacre" in the title',
    });
  });
});

describe("hooptober-2026", () => {
  const template = LIST_TEMPLATES["hooptober-2026"];

  it("declares all 23 challenge categories", () => {
    expect(template.tags).toHaveLength(23);
  });

  it("uses the ranked preset: list layout, ranking on, voting off", () => {
    expect(listTemplateFlags(template)).toEqual(LIST_PRESETS.ranked);
    expect(listTemplateFlags(template).displayMode).toBe("LIST");
    expect(listTemplateFlags(template).rankingEnabled).toBe(true);
  });

  it("windows the challenge to 1 Sep – 31 Oct 2026 in UTC", () => {
    expect(listTemplateChallengeWindow(template)).toEqual({
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2026-10-31T00:00:00.000Z"),
    });
  });
});

describe("getListTemplate", () => {
  it("resolves a known id", () => {
    expect(getListTemplate("hooptober-2026")).toBe(
      LIST_TEMPLATES["hooptober-2026"],
    );
  });

  it("returns null for anything else", () => {
    expect(getListTemplate("hooptober-1999")).toBeNull();
    expect(getListTemplate(undefined)).toBeNull();
    expect(getListTemplate(null)).toBeNull();
    expect(getListTemplate(7)).toBeNull();
  });
});

describe("isListTemplateId", () => {
  it("accepts a shipped id and rejects a lookalike", () => {
    expect(isListTemplateId("hooptober-2026")).toBe(true);
    expect(isListTemplateId("Hooptober-2026")).toBe(false);
  });
});

describe("listTemplateChallengeWindow", () => {
  it("returns nulls when a template sets no window", () => {
    expect(
      listTemplateChallengeWindow({
        ...LIST_TEMPLATES["hooptober-2026"],
        challengeStartsAt: null,
        challengeEndsAt: null,
      }),
    ).toEqual({ startsAt: null, endsAt: null });
  });

  it("returns null for a malformed date rather than an Invalid Date", () => {
    expect(
      listTemplateChallengeWindow({
        ...LIST_TEMPLATES["hooptober-2026"],
        challengeStartsAt: "September 2026",
        challengeEndsAt: null,
      }).startsAt,
    ).toBeNull();
  });
});
