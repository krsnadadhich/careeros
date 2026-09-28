-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "sourceEmailId" TEXT;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;
