-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "excludedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "fingerprint" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Job_userId_fingerprint_key" ON "Job"("userId", "fingerprint");
