-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_schoolId_studentId_idx" ON "Invoice"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Payment_schoolId_studentId_idx" ON "Payment"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
