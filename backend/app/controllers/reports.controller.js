// backend/app/controllers/reports.controller.js
const { prisma } = require("../config/prisma");

// helper: active term
async function getActiveTermId(schoolId) {
  const t = await prisma.term.findFirst({
    where: { schoolId, isActive: true },
  });
  return t ? t.id : null;
}

// GET /api/reports/debtors?asOf=YYYY-MM-DD&classId=&termId=
exports.debtors = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const asOfStr = (req.query.asOf || "").trim();
    const classId = (req.query.classId || "").trim();
    let termId = (req.query.termId || "").trim();

    if (!asOfStr) {
      return res.status(400).json({ error: "asOf (YYYY-MM-DD) is required" });
    }
    const asOf = new Date(asOfStr + "T23:59:59.999Z");

    if (!termId) {
      termId = await getActiveTermId(schoolId);
    }

    const invWhere = {
      schoolId,
      status: { in: ["unpaid", "partial"] },
      ...(termId ? { termId } : {}),
      ...(classId ? { student: { currentClassId: classId } } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where: invWhere,
      select: {
        id: true,
        studentId: true,
        amount: true,
        issuedAt: true,
        termId: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
            currentClassId: true,
            currentClass: { select: { id: true, name: true, stream: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    if (!invoices.length) return res.json({ data: [], asOf: asOfStr, termId });

    const invoiceIds = invoices.map((i) => i.id);
    const pays = await prisma.payment.groupBy({
      by: ["invoiceId"],
      where: { invoiceId: { in: invoiceIds }, paidAt: { lte: asOf } },
      _sum: { amount: true },
    });
    const paidByInv = new Map(
      pays.map((p) => [p.invoiceId, Number(p._sum.amount || 0)])
    );

    const perStudent = new Map();
    for (const inv of invoices) {
      const paid = paidByInv.get(inv.id) || 0;
      const amount = Number(inv.amount);
      const balance = Math.max(0, amount - paid);
      if (balance <= 0) continue;

      const key = inv.studentId;
      const st = inv.student;
      const cur = perStudent.get(key) || {
        studentId: st.id,
        studentCode: st.studentCode,
        firstName: st.firstName,
        lastName: st.lastName,
        className: st.currentClass
          ? `${st.currentClass.name}${
              st.currentClass.stream ? " " + st.currentClass.stream : ""
            }`
          : null,
        invoiceCount: 0,
        totalDue: 0,
        totalPaid: 0,
        balance: 0,
        latestInvoice: inv.issuedAt,
      };

      cur.invoiceCount += 1;
      cur.totalDue += amount;
      cur.totalPaid += paid;
      cur.balance += balance;
      if (inv.issuedAt > cur.latestInsuance) {
        cur.latestInvoice = inv.issuedAt;
      }

      perStudent.set(key, cur);
    }

    const rows = Array.from(perStudent.values())
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    res.json({ data: rows, asOf: asOfStr, termId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
