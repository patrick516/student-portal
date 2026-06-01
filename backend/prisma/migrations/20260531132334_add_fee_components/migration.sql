-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "overrideAmount" DECIMAL(12,2),
ADD COLUMN     "overrideReason" TEXT;

-- CreateTable
CREATE TABLE "FeeComponent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'school',
    "classId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeComponent_schoolId_termId_idx" ON "FeeComponent"("schoolId", "termId");

-- CreateIndex
CREATE INDEX "FeeComponent_schoolId_termId_classId_idx" ON "FeeComponent"("schoolId", "termId", "classId");

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
