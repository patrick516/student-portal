-- CreateTable
CREATE TABLE "FeeSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeSetting_schoolId_termId_classId_idx" ON "FeeSetting"("schoolId", "termId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSetting_schoolId_termId_classId_key" ON "FeeSetting"("schoolId", "termId", "classId");

-- AddForeignKey
ALTER TABLE "FeeSetting" ADD CONSTRAINT "FeeSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
