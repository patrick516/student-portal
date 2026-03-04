-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Term_schoolId_year_name_idx" ON "Term"("schoolId", "year", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Term_schoolId_name_year_key" ON "Term"("schoolId", "name", "year");

-- CreateIndex
CREATE INDEX "Invoice_schoolId_termId_idx" ON "Invoice"("schoolId", "termId");

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
