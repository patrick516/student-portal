-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "relation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guardian_schoolId_studentId_idx" ON "Guardian"("schoolId", "studentId");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
