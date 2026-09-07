-- Data-only migration. No schema change.
--
-- Recomputes ListTag."normalized" with the hardened rule in
-- src/lib/list-item-tags.ts (tagComparisonKey): NFKC, drop invisible/format
-- characters, collapse whitespace, trim, lowercase. The two must agree — if
-- they drift, a tag typed fresh stops matching the row already stored for it.
--
-- Why: a label carrying a zero-width space, a soft hyphen or a non-breaking
-- space renders identically to the plain spelling but compared as a different
-- string, so a list could hold two tags that both read "Tobe Hooper". Those
-- rows predate the ListTag reshape; that migration faithfully carried both
-- across, and the new tag list is simply the first place they became visible.
--
-- Homoglyphs are deliberately NOT folded here: a Cyrillic "о" stays distinct
-- from a Latin "o", because merging look-alikes across scripts would collapse
-- tags that are genuinely different words.

-- The new key for every existing tag.
CREATE TEMP TABLE tag_keys AS
SELECT
  id,
  "listId",
  "createdAt",
  lower(btrim(regexp_replace(
    regexp_replace(
      normalize(label, NFKC),
      '[­​-‏⁠-⁤﻿]', '', 'g'),
    '\s+', ' ', 'g'))) AS new_key
FROM "ListTag";

-- One survivor per (list, new key): the oldest, then the lowest id, which is
-- the same tie-break buildTagVocabulary() and the reshape migration used.
CREATE TEMP TABLE winners AS
SELECT DISTINCT ON ("listId", new_key)
  "listId", new_key, id AS winner_id
FROM tag_keys
ORDER BY "listId", new_key, "createdAt" ASC, id ASC;

CREATE TEMP TABLE merges AS
SELECT k.id AS loser_id, w.winner_id
FROM tag_keys k
JOIN winners w ON w."listId" = k."listId" AND w.new_key = k.new_key
WHERE k.id <> w.winner_id;

-- Drop assignments that cannot be repointed without duplicating the survivor
-- on the same item: either the item already carries the survivor, or several
-- merged-away tags on this item map to it and only one may remain.
DELETE FROM "ListItemTag" lit
USING merges m
WHERE lit."listTagId" = m.loser_id
  AND (
    EXISTS (
      SELECT 1 FROM "ListItemTag" x
      WHERE x."listItemId" = lit."listItemId"
        AND x."listTagId" = m.winner_id
    )
    OR lit.id <> (
      SELECT min(l2.id)
      FROM "ListItemTag" l2
      JOIN merges m2 ON l2."listTagId" = m2.loser_id
      WHERE l2."listItemId" = lit."listItemId"
        AND m2.winner_id = m.winner_id
    )
  );

-- Every remaining assignment on a merged-away tag is now unique for its item.
UPDATE "ListItemTag" lit
SET "listTagId" = m.winner_id
FROM merges m
WHERE lit."listTagId" = m.loser_id;

DELETE FROM "ListTag" lt
USING merges m
WHERE lt.id = m.loser_id;

-- Survivors adopt the new key. Losers are gone, so no unique collision is left.
UPDATE "ListTag" lt
SET normalized = k.new_key
FROM tag_keys k
WHERE k.id = lt.id
  AND lt.normalized <> k.new_key;

-- Clean the stored labels too, matching normalizeTagLabel(): drop invisible
-- characters, collapse whitespace, trim. Case and typography are left alone.
-- The survivor of a merge can itself be the row carrying the invisible
-- character, and nothing else would ever rewrite it.
UPDATE "ListTag"
SET label = btrim(regexp_replace(
      regexp_replace(label, '[­​-‏⁠-⁤﻿]', '', 'g'),
      '\s+', ' ', 'g'))
WHERE label <> btrim(regexp_replace(
      regexp_replace(label, '[­​-‏⁠-⁤﻿]', '', 'g'),
      '\s+', ' ', 'g'));

DROP TABLE merges;
DROP TABLE winners;
DROP TABLE tag_keys;
