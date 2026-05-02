-- CreateTable
CREATE TABLE "PickerSession" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "roomId" TEXT,
    "participants" JSONB NOT NULL,
    "attractors" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "pickedTmdbId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickerRoomPreset" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "participantIds" JSONB NOT NULL,
    "attractors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickerRoomPreset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PickerSession" ADD CONSTRAINT "PickerSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickerSession" ADD CONSTRAINT "PickerSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PickerRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickerRoomPreset" ADD CONSTRAINT "PickerRoomPreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
