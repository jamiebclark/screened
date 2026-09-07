-- AlterTable
ALTER TABLE "ListItem" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ListItemTag" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItemTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListItemTag_listItemId_idx" ON "ListItemTag"("listItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItemTag_listItemId_normalized_key" ON "ListItemTag"("listItemId", "normalized");

-- AddForeignKey
ALTER TABLE "ListItemTag" ADD CONSTRAINT "ListItemTag_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
