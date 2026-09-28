-- AlterEnum
ALTER TYPE "EmailCategory" ADD VALUE 'REJECTION';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "lastIgnoredStatus" "ApplicationStatus",
ADD COLUMN     "suggestedAt" TIMESTAMP(3),
ADD COLUMN     "suggestedFromEmailId" TEXT,
ADD COLUMN     "suggestedReason" TEXT,
ADD COLUMN     "suggestedStatus" "ApplicationStatus";
