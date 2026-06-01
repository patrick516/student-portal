-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "note" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'payment';

-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'upcoming';

-- CreateTable
CREATE TABLE "StudentCredit" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "termId" TEXT,
    "appliedTermId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentCredit_schoolId_studentId_idx" ON "StudentCredit"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "StudentCredit_schoolId_status_idx" ON "StudentCredit"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCredit" ADD CONSTRAINT "StudentCredit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
