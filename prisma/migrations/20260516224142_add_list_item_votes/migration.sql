-- CreateTable
CREATE TABLE "ListItemVote" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItemVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListItemVote_listItemId_userId_key" ON "ListItemVote"("listItemId", "userId");

-- AddForeignKey
ALTER TABLE "ListItemVote" ADD CONSTRAINT "ListItemVote_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItemVote" ADD CONSTRAINT "ListItemVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
