-- CreateTable
CREATE TABLE "ListItemComment" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItemCommentRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItemCommentRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListItemCommentRead_userId_listItemId_key" ON "ListItemCommentRead"("userId", "listItemId");

-- AddForeignKey
ALTER TABLE "ListItemComment" ADD CONSTRAINT "ListItemComment_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItemComment" ADD CONSTRAINT "ListItemComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItemCommentRead" ADD CONSTRAINT "ListItemCommentRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItemCommentRead" ADD CONSTRAINT "ListItemCommentRead_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
