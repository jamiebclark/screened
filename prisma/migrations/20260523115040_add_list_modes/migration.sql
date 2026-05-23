-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('GRID', 'LIST');

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "displayMode" "DisplayMode" NOT NULL DEFAULT 'GRID',
ADD COLUMN     "itemCap" INTEGER,
ADD COLUMN     "rankingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "votingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ListItem" ADD COLUMN     "noteIsSpoiler" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" INTEGER;
