-- CreateTable
CREATE TABLE "LetterboxdConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "letterboxdUsername" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterboxdConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetterboxdConnection_userId_key" ON "LetterboxdConnection"("userId");

-- AddForeignKey
ALTER TABLE "LetterboxdConnection" ADD CONSTRAINT "LetterboxdConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
