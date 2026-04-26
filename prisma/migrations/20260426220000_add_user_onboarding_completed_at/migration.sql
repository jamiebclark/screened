-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill: existing users are treated as already onboarded
UPDATE "User" SET "onboardingCompletedAt" = "createdAt" WHERE "onboardingCompletedAt" IS NULL;
