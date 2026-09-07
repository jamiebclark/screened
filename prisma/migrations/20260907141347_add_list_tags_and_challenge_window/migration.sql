-- 1. The new canonical vocabulary table.
CREATE TABLE "ListTag" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListTag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListTag_listId_idx" ON "ListTag"("listId");
CREATE UNIQUE INDEX "ListTag_listId_normalized_key" ON "ListTag"("listId", "normalized");
ALTER TABLE "ListTag" ADD CONSTRAINT "ListTag_listId_fkey"
    FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill one ListTag per (listId, normalized). The label and createdAt come from the
--    OLDEST assignment carrying that normalized form, which is exactly the tie-break
--    buildTagVocabulary() uses today, so displayed names do not change.
INSERT INTO "ListTag" ("id", "listId", "label", "normalized", "createdAt")
SELECT DISTINCT ON (li."listId", t."normalized")
       gen_random_uuid()::text, li."listId", t."label", t."normalized", t."createdAt"
FROM "ListItemTag" t
JOIN "ListItem" li ON li."id" = t."listItemId"
ORDER BY li."listId", t."normalized", t."createdAt" ASC, t."id" ASC;

-- 3. Nullable first, so existing rows survive the ALTER.
ALTER TABLE "ListItemTag" ADD COLUMN "listTagId" TEXT;

-- 4. Point every existing assignment at its ListTag.
UPDATE "ListItemTag" t
SET "listTagId" = lt."id"
FROM "ListItem" li, "ListTag" lt
WHERE li."id" = t."listItemId"
  AND lt."listId" = li."listId"
  AND lt."normalized" = t."normalized";

-- 5. The safety net. If step 4 missed even one row this raises and the whole migration
--    rolls back. Do NOT "fix" a failure here by deleting NULL rows — that destroys the
--    exact data FR-010 protects.
ALTER TABLE "ListItemTag" ALTER COLUMN "listTagId" SET NOT NULL;

-- 6. Only now is it safe to drop the denormalized shape.
DROP INDEX "ListItemTag_listItemId_normalized_key";
ALTER TABLE "ListItemTag" DROP COLUMN "label";
ALTER TABLE "ListItemTag" DROP COLUMN "normalized";

-- 7. New constraints on the join.
CREATE UNIQUE INDEX "ListItemTag_listItemId_listTagId_key" ON "ListItemTag"("listItemId", "listTagId");
CREATE INDEX "ListItemTag_listTagId_idx" ON "ListItemTag"("listTagId");
ALTER TABLE "ListItemTag" ADD CONSTRAINT "ListItemTag_listTagId_fkey"
    FOREIGN KEY ("listTagId") REFERENCES "ListTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. The challenge window.
ALTER TABLE "List" ADD COLUMN "challengeStartsAt" TIMESTAMP(3);
ALTER TABLE "List" ADD COLUMN "challengeEndsAt" TIMESTAMP(3);
