// backend/app/services/credit.service.js
const { prisma } = require("../config/prisma");

/**
 * Apply available student credits to a new invoice.
 * Returns { applied, remaining } amounts.
 */
async function applyCreditsToInvoice(schoolId, studentId, invoiceId) {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new Error("Invoice not found");

  const invoiceTotal = Number(inv.overrideAmount ?? inv.amount);

  // How much already paid
  const paidAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { invoiceId },
  });
  const alreadyPaid = Number(paidAgg._sum.amount || 0);
  let stillOwed = Math.max(0, invoiceTotal - alreadyPaid);

  if (stillOwed <= 0) return { applied: 0, remaining: 0 };

  // Get available credits for student
  const credits = await prisma.studentCredit.findMany({
    where: { schoolId, studentId, status: "available" },
    orderBy: { createdAt: "asc" }, // oldest first
  });

  if (!credits.length) return { applied: 0, remaining: stillOwed };

  let totalApplied = 0;

  for (const credit of credits) {
    if (stillOwed <= 0) break;

    const creditAmt = Number(credit.amount);
    const useAmount = Math.min(creditAmt, stillOwed);

    // Create a payment record for the credit
    await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        studentId,
        amount: useAmount,
        type: "credit_carryover",
        note: `Credit carryover from previous term`,
        recordedBy: null,
      },
    });

    // Update credit record
    const newCreditAmt = creditAmt - useAmount;
    await prisma.studentCredit.update({
      where: { id: credit.id },
      data: {
        amount: newCreditAmt,
        status: newCreditAmt <= 0 ? "applied" : "partial",
        appliedTermId: inv.termId || null,
      },
    });

    stillOwed -= useAmount;
    totalApplied += useAmount;
  }

  // Recompute invoice status
  const newPaidAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { invoiceId },
  });
  const newTotalPaid = Number(newPaidAgg._sum.amount || 0);
  const status =
    newTotalPaid >= invoiceTotal
      ? "paid"
      : newTotalPaid > 0
        ? "partial"
        : "unpaid";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });

  return { applied: totalApplied, remaining: stillOwed };
}

/**
 * Get total available credit for a student
 */
async function getStudentCreditBalance(schoolId, studentId) {
  const agg = await prisma.studentCredit.aggregate({
    _sum: { amount: true },
    where: { schoolId, studentId, status: { in: ["available", "partial"] } },
  });
  return Number(agg._sum.amount || 0);
}

module.exports = { applyCreditsToInvoice, getStudentCreditBalance };
