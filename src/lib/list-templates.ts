import { validateTagName } from "@/lib/list-item-tags";
import {
  applyPreset,
  type ListFeatureFlags,
  type ListPreset,
} from "@/lib/list-presets";

/**
 * A template is a preset plus the content a challenge needs on day one: a name,
 * the categories declared as tags, and the window they have to be watched in.
 * Presets stay purely about feature flags — see list-presets.ts.
 *
 * Imported by both the create form and the create route, so this module must
 * stay free of server-only imports (prisma, next/server).
 */
export type ListTemplate = {
  id: ListTemplateId;
  label: string;
  /** One line for the template card in the create form. */
  summary: string;
  /** Prefilled into the form; the user can still edit both before creating. */
  defaultName: string;
  defaultDescription: string;
  /** Feature flags come from an existing preset rather than being restated. */
  preset: ListPreset;
  /** Calendar dates as `YYYY-MM-DD`, read as UTC. Null means no window. */
  challengeStartsAt: string | null;
  challengeEndsAt: string | null;
  /** Categories to declare as list tags, in the order the challenge lists them. */
  tags: readonly string[];
};

export const LIST_TEMPLATE_IDS = ["hooptober-2026"] as const;

export type ListTemplateId = (typeof LIST_TEMPLATE_IDS)[number];

export const LIST_TEMPLATES: Record<ListTemplateId, ListTemplate> = {
  "hooptober-2026": {
    id: "hooptober-2026",
    label: "Hooptober 2026",
    summary: "Ranked list with all 23 categories declared",
    defaultName: "Hooptober 2026",
    defaultDescription:
      "Hooptober the 13th: The Final Chapter. 31 films covering the categories below.",
    preset: "ranked",
    challengeStartsAt: "2026-09-01",
    challengeEndsAt: "2026-10-31",
    tags: [
      "Sequel",
      "Steve Miner",
      "Meta Horror",
      '"Massacre" in the title',
      '"Devil" in the title',
      "Screaming Mad George",
      "George Romero",
      "Black director",
      "Michael Gough",
      "Haunted house/building/room",
      "Starring a childhood crush",
      "Tom Savini",
      "Cursed item",
      "LGBTQIA+",
      "baaaad kid",
      "Sam Neill",
      "Inanimate object is alive",
      "Horror at sea",
      "Bela Lugosi",
      "Harry Manfredini score",
      "Lowest rated from 1980s you have not seen",
      "1981 you haven't seen",
      "Tobe Hooper",
    ],
  },
};

export const LIST_TEMPLATE_LIST: readonly ListTemplate[] =
  LIST_TEMPLATE_IDS.map((id) => LIST_TEMPLATES[id]);

export function isListTemplateId(value: unknown): value is ListTemplateId {
  return (
    typeof value === "string" &&
    (LIST_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

/** Resolves a request-supplied id to a template, or null if it isn't one. */
export function getListTemplate(value: unknown): ListTemplate | null {
  return isListTemplateId(value) ? LIST_TEMPLATES[value] : null;
}

export function listTemplateFlags(template: ListTemplate): ListFeatureFlags {
  return applyPreset(template.preset);
}

/**
 * ListTag rows for a new list. Deduplicated by comparison key so two categories
 * that only differ by case or an invisible character don't collide on the
 * `[listId, normalized]` unique index and fail the whole create.
 *
 * Labels that fail validation are dropped rather than thrown — a bad template
 * entry shouldn't turn list creation into a 500. `list-templates.test.ts`
 * asserts every shipped template survives this intact.
 */
export function listTemplateTagRows(
  template: ListTemplate,
): { label: string; normalized: string }[] {
  const rows: { label: string; normalized: string }[] = [];
  const seen = new Set<string>();

  for (const raw of template.tags) {
    const result = validateTagName(raw);
    if (!result.ok) continue;
    const { label, normalized } = result.value;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    rows.push({ label, normalized });
  }

  return rows;
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a template's `YYYY-MM-DD` into a UTC day start, matching List.challenge* storage. */
function parseCalendarDate(value: string | null): Date | null {
  if (value == null) return null;
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function listTemplateChallengeWindow(template: ListTemplate): {
  startsAt: Date | null;
  endsAt: Date | null;
} {
  return {
    startsAt: parseCalendarDate(template.challengeStartsAt),
    endsAt: parseCalendarDate(template.challengeEndsAt),
  };
}
