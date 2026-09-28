-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "classificationSource" TEXT;
ALTER TABLE "Email" ADD COLUMN     "classificationConfidence" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "JobMatch" ADD COLUMN     "locationScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobMatch" ADD COLUMN     "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
