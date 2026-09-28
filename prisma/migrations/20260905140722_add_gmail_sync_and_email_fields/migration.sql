-- AlterEnum
ALTER TYPE "EmailPriority" ADD VALUE 'CRITICAL';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "bodyText" TEXT,
ADD COLUMN     "extractedData" JSONB,
ADD COLUMN     "gmailThreadId" TEXT,
ADD COLUMN     "importanceScore" INTEGER;

-- CreateTable
CREATE TABLE "GmailSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "historyId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT NOT NULL DEFAULT 'never',
    "lastSyncError" TEXT,
    "emailsProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailSync_userId_key" ON "GmailSync"("userId");

-- CreateIndex
CREATE INDEX "Email_gmailThreadId_idx" ON "Email"("gmailThreadId");

-- AddForeignKey
ALTER TABLE "GmailSync" ADD CONSTRAINT "GmailSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
