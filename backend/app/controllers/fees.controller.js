// backend/app/controllers/fees.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");
const { sendPaymentReceiptEmail } = require("../services/mail.service");

// helper: get active term id for school (or null)
async function getActiveTermId(schoolId) {
  const t = await prisma.term.findFirst({
    where: { schoolId, isActive: true },
  });
  return t ? t.id : null;
}

// GET /api/fees/invoices?studentId=&status=&termId=
exports.listInvoices = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId, status, termId } = req.query;

    const where = {
      schoolId,
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
    };

    let termFilter = termId || null;
    if (!termFilter) {
      termFilter = await getActiveTermId(schoolId);
    }
    if (termFilter) {
      where.termId = termFilter;
    }

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
    });
    res.json({ data: rows, termId: termFilter || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/fees/invoices  { studentId, amount, termId? }
exports.createInvoice = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    let { studentId, amount, termId } = req.body || {};
    if (!studentId || amount === undefined) {
      return res.status(400).json({ error: "studentId, amount required" });
    }

    if (!termId) {
      termId = await getActiveTermId(schoolId);
    }

    const inv = await prisma.invoice.create({
      data: {
        schoolId,
        studentId,
        amount,
        termId: termId || null,
        status: "unpaid",
      },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.create-invoice",
      resource: "invoice",
      targetId: inv.id,
      meta: { studentId, amount, termId: inv.termId },
    });

    res.status(201).json(inv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/fees/payments?studentId=&termId=
exports.listPayments = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId, termId } = req.query;

    let termFilter = termId || null;
    if (!termFilter) {
      termFilter = await getActiveTermId(schoolId);
    }

    const where = {
      schoolId,
      ...(studentId ? { studentId } : {}),
      ...(termFilter ? { invoice: { termId: termFilter } } : {}),
    };

    const rows = await prisma.payment.findMany({
      where,
      include: { invoice: true },
      orderBy: { paidAt: "desc" },
    });

    res.json({ data: rows, termId: termFilter || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/fees/payments  { invoiceId, studentId, amount, method?, reference? }
// POST /api/fees/payments  { invoiceId, studentId, amount, method?, reference? }
exports.createPayment = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { invoiceId, studentId, amount, method, reference } = req.body || {};
    if (!invoiceId || !studentId || amount === undefined) {
      return res
        .status(400)
        .json({ error: "invoiceId, studentId, amount required" });
    }

    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
    });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    const payAmount = Number(amount);

    // Use overrideAmount if set, otherwise use amount
    const invoiceTotal = Number(inv.overrideAmount ?? inv.amount);

    // How much has already been paid on this invoice
    const prevAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { invoiceId },
    });
    const alreadyPaid = Number(prevAgg._sum.amount || 0);
    const remaining = Math.max(0, invoiceTotal - alreadyPaid);

    // Split payment: up to remaining goes to invoice, rest is credit
    const appliedAmount = Math.min(payAmount, remaining + payAmount); // full amount recorded
    const overpayment = Math.max(0, payAmount - remaining);

    // Create the payment record
    const pay = await prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        studentId,
        amount: payAmount,
        method: method || null,
        reference: reference || null,
        recordedBy: req.user.id,
        type: "payment",
      },
    });

    // Recompute invoice status
    const newTotalPaid = alreadyPaid + payAmount;
    const status =
      newTotalPaid >= invoiceTotal
        ? "paid"
        : newTotalPaid > 0
          ? "partial"
          : "unpaid";

    const updatedInv = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    // If overpayment, store as credit
    let credit = null;
    if (overpayment > 0) {
      credit = await prisma.studentCredit.create({
        data: {
          schoolId,
          studentId,
          amount: overpayment,
          source: "overpayment",
          termId: inv.termId || null,
          status: "available",
        },
      });
    }

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.create-payment",
      resource: "payment",
      targetId: pay.id,
      meta: { invoiceId, amount: payAmount, overpayment, creditId: credit?.id },
    });

    res.status(201).json({
      payment: pay,
      invoice: updatedInv,
      overpayment,
      credit,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/fees/invoices/:id/override
// Bursar/admin manually overrides invoice amount for a specific student
exports.overrideInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { overrideAmount, overrideReason } = req.body || {};
    const schoolId = req.user.schoolId;

    if (overrideAmount === undefined) {
      return res.status(400).json({ error: "overrideAmount required" });
    }

    const amt = Number(overrideAmount);
    if (amt <= 0) {
      return res.status(400).json({ error: "overrideAmount must be > 0" });
    }

    const inv = await prisma.invoice.findFirst({
      where: { id, schoolId },
    });
    if (!inv) return res.status(404).json({ error: "Invoice not found" });

    // Recompute status based on new override amount
    const paidAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { invoiceId: id },
    });
    const totalPaid = Number(paidAgg._sum.amount || 0);
    const status =
      totalPaid >= amt ? "paid" : totalPaid > 0 ? "partial" : "unpaid";

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        overrideAmount: amt,
        overrideReason: overrideReason?.trim() || null,
        status,
      },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.invoice.override",
      resource: "invoice",
      targetId: id,
      meta: { overrideAmount: amt, overrideReason },
    });

    res.json({
      data: {
        ...updated,
        amount: Number(updated.amount),
        overrideAmount: Number(updated.overrideAmount),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/fees/credits?studentId=
exports.listCredits = async (req, res) => {
  try {
    const { studentId } = req.query;
    const schoolId = req.user.schoolId;

    const credits = await prisma.studentCredit.findMany({
      where: {
        schoolId,
        ...(studentId ? { studentId } : {}),
        status: "available",
      },
      orderBy: { createdAt: "desc" },
    });

    const total = credits.reduce((sum, c) => sum + Number(c.amount), 0);

    res.json({ data: credits, totalCredit: total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
// GET /api/fees/payments/:id/receipt  (unchanged from previous)
exports.getPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const pay = await prisma.payment.findFirst({
      where: { id, schoolId: req.user.schoolId },
      select: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        paidAt: true,
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            issuedAt: true,
            termId: true,
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
            currentClass: { select: { name: true, stream: true } },
          },
        },
      },
    });
    if (!pay) return res.status(404).json({ error: "Payment not found" });

    const school = await prisma.school.findFirst({
      where: { id: req.user.schoolId },
      select: { name: true },
    });

    res.json({
      data: {
        receiptId: pay.id,
        paidAt: pay.paidAt,
        amount: Number(pay.amount),
        method: pay.method || null,
        reference: pay.reference || null,
        invoice: {
          id: pay.invoice?.id || null,
          amount: pay.invoice ? Number(pay.invoice.amount) : null,
          status: pay.invoice?.status || null,
          issuedAt: pay.invoice?.issuedAt || null,
          termId: pay.invoice?.termId || null,
        },
        student: {
          id: pay.student.id,
          code: pay.student.studentCode,
          name: `${pay.student.firstName} ${pay.student.lastName}`,
          klass: pay.student.currentClass
            ? `${pay.student.currentClass.name}${
                pay.student.currentClass.stream
                  ? " " + pay.student.currentClass.stream
                  : ""
              }`
            : null,
        },
        school: {
          name: school?.name || "School",
        },
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.notifyGuardiansForPayment = async (req, res) => {
  try {
    const { id } = req.params; // payment id
    const pay = await prisma.payment.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: {
        student: {
          select: { firstName: true, lastName: true, studentCode: true },
        },
        invoice: true,
      },
    });
    if (!pay) return res.status(404).json({ error: "Payment not found" });

    const guardians = await prisma.guardian.findMany({
      where: { schoolId: req.user.schoolId, studentId: pay.studentId },
    });

    const school = await prisma.school.findFirst({
      where: { id: req.user.schoolId },
      select: { name: true },
    });

    for (const g of guardians) {
      if (!g.email) continue;
      await sendPaymentReceiptEmail({
        to: g.email,
        studentName: `${pay.student.firstName} ${pay.student.lastName}`,
        amount: Number(pay.amount),
        invoiceId: pay.invoiceId,
        schoolName: school?.name || "School",
      });
    }

    res.json({ ok: true, notified: guardians.filter((g) => g.email).length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
