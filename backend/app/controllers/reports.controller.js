// backend/app/controllers/reports.controller.js
const { prisma } = require("../config/prisma");

async function getActiveTermId(schoolId) {
  const t = await prisma.term.findFirst({
    where: { schoolId, isActive: true },
  });
  return t ? t.id : null;
}

async function getSchoolInfo(schoolId) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      motto: true,
      logoUrl: true,
    },
  });
}

// GET /api/reports/debtors
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
    if (!termId) termId = await getActiveTermId(schoolId);

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
      pays.map((p) => [p.invoiceId, Number(p._sum.amount || 0)]),
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
      if (inv.issuedAt > cur.latestInvoice) cur.latestInvoice = inv.issuedAt;
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

// GET /api/reports/fees?termId=&classId=&status=
exports.feesReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const classId = (req.query.classId || "").trim();
    const statusFilter = (req.query.status || "").trim(); // paid|partial|unpaid|all
    let termId = (req.query.termId || "").trim();

    if (!termId) termId = await getActiveTermId(schoolId);

    // Load school info for report header
    const school = await getSchoolInfo(schoolId);

    // Load term info
    const term = termId
      ? await prisma.term.findUnique({ where: { id: termId } })
      : null;

    // Load all classes in school
    const classWhere = { schoolId };
    const allClasses = await prisma.class.findMany({
      where: classWhere,
      select: { id: true, name: true, stream: true, year: true },
      orderBy: { name: "asc" },
    });

    // Determine which classes to include
    const targetClasses = classId
      ? allClasses.filter((c) => c.id === classId)
      : allClasses;

    const targetClassIds = targetClasses.map((c) => c.id);

    // Load all students in target classes
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        currentClassId: { in: targetClassIds },
        status: "active",
      },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        currentClassId: true,
        currentClass: { select: { id: true, name: true, stream: true } },
        guardians: {
          select: { name: true, phone: true },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    if (!students.length) {
      return res.json({
        data: { school, term, summary: [], students: [], totals: {} },
      });
    }

    const studentIds = students.map((s) => s.id);

    // Load invoices for these students filtered by term
    const invoiceWhere = {
      schoolId,
      studentId: { in: studentIds },
      ...(termId ? { termId } : {}),
    };

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        studentId: true,
        amount: true,
        status: true,
        issuedAt: true,
        termId: true,
      },
    });

    // Load fee settings for required amount per class
    const feeSettings = await prisma.feeSetting.findMany({
      where: {
        schoolId,
        ...(termId ? { termId } : {}),
        classId: { in: targetClassIds },
      },
    });

    const feeByClass = new Map(
      feeSettings.map((f) => [f.classId, Number(f.amount)]),
    );

    // Load payments for these invoices
    const invoiceIds = invoices.map((i) => i.id);
    const payments =
      invoiceIds.length > 0
        ? await prisma.payment.groupBy({
            by: ["invoiceId"],
            where: { invoiceId: { in: invoiceIds } },
            _sum: { amount: true },
          })
        : [];

    const paidByInv = new Map(
      payments.map((p) => [p.invoiceId, Number(p._sum.amount || 0)]),
    );

    // Build per-student fee data
    const invByStudent = new Map();
    for (const inv of invoices) {
      if (!invByStudent.has(inv.studentId)) invByStudent.set(inv.studentId, []);
      invByStudent.get(inv.studentId).push(inv);
    }

    const studentRows = students.map((s) => {
      const studentInvoices = invByStudent.get(s.id) || [];
      const required = feeByClass.get(s.currentClassId || "") || 0;
      const totalPaid = studentInvoices.reduce((sum, inv) => {
        return sum + (paidByInv.get(inv.id) || 0);
      }, 0);
      const balance = Math.max(0, required - totalPaid);

      let payStatus = "no_payment";
      if (required === 0) {
        payStatus = "clear";
      } else if (totalPaid >= required) {
        payStatus = "paid";
      } else if (totalPaid > 0) {
        payStatus = "partial";
      }

      return {
        studentId: s.id,
        studentCode: s.studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
        classId: s.currentClassId,
        className: s.currentClass
          ? `${s.currentClass.name}${
              s.currentClass.stream ? " " + s.currentClass.stream : ""
            }`
          : null,
        guardian: s.guardians?.[0]?.name || null,
        guardianPhone: s.guardians?.[0]?.phone || null,
        required,
        totalPaid,
        balance,
        status: payStatus,
      };
    });

    // Apply status filter
    const filteredRows =
      statusFilter && statusFilter !== "all"
        ? studentRows.filter((r) => r.status === statusFilter)
        : studentRows;

    // Build summary by class
    const summaryMap = new Map();
    for (const row of studentRows) {
      const key = row.classId || "unassigned";
      const cur = summaryMap.get(key) || {
        classId: key,
        className: row.className || "Unassigned",
        total: 0,
        paidFull: 0,
        partial: 0,
        noPayment: 0,
        debtors: 0,
        collected: 0,
        outstanding: 0,
      };
      cur.total += 1;
      if (row.status === "paid") cur.paidFull += 1;
      else if (row.status === "partial") cur.partial += 1;
      else if (row.status === "no_payment") cur.noPayment += 1;
      if (row.balance > 0) cur.debtors += 1;
      cur.collected += row.totalPaid;
      cur.outstanding += row.balance;
      summaryMap.set(key, cur);
    }

    const summary = Array.from(summaryMap.values());

    // Overall totals
    const totals = {
      totalStudents: studentRows.length,
      paidFull: studentRows.filter((r) => r.status === "paid").length,
      partial: studentRows.filter((r) => r.status === "partial").length,
      noPayment: studentRows.filter((r) => r.status === "no_payment").length,
      debtors: studentRows.filter((r) => r.balance > 0).length,
      totalCollected: studentRows.reduce((s, r) => s + r.totalPaid, 0),
      totalOutstanding: studentRows.reduce((s, r) => s + r.balance, 0),
      totalRequired: studentRows.reduce((s, r) => s + r.required, 0),
    };

    res.json({
      data: {
        school,
        term,
        summary,
        students: filteredRows,
        totals,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
