// backend/app/controllers/terms.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");
const { applyCreditsToInvoice } = require("../services/credit.service");
const { sendMail } = require("../services/mail.service");

// GET /api/terms
exports.list = async (req, res) => {
  try {
    const items = await prisma.term.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ year: "desc" }, { startDate: "asc" }],
    });
    res.json({ data: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/terms
exports.create = async (req, res) => {
  try {
    const { name, year, startDate, endDate } = req.body || {};
    if (!name || !year || !startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "name, year, startDate, endDate required" });
    }
    const term = await prisma.term.create({
      data: {
        schoolId: req.user.schoolId,
        name,
        year: Number(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: false,
        status: "upcoming",
      },
    });
    res.status(201).json(term);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/terms/:id/activate
exports.activate = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const term = await prisma.term.findFirst({ where: { id, schoolId } });
    if (!term) return res.status(404).json({ error: "Term not found" });
    if (term.isActive) return res.json({ ok: true, message: "Already active" });

    // 1) End the current active term
    await prisma.term.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false, status: "ended" },
    });

    // 2) Activate new term
    const activeTerm = await prisma.term.update({
      where: { id },
      data: { isActive: true, status: "active" },
    });

    // 3) Get school info for emails
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logoUrl: true },
    });

    // 4) Get all active students
    const students = await prisma.student.findMany({
      where: { schoolId, status: "active", currentClassId: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentCode: true,
        currentClassId: true,
        guardians: { select: { email: true, name: true }, take: 1 },
      },
    });

    // 5) Get fee components for this term
    const feeComponents = await prisma.feeComponent.findMany({
      where: { schoolId, termId: id },
    });

    // 6) Get fee settings (legacy) as fallback
    const feeSettings = await prisma.feeSetting.findMany({
      where: { schoolId, termId: id },
    });
    const feeByClass = new Map(
      feeSettings.map((f) => [f.classId, Number(f.amount)]),
    );

    let invoicesCreated = 0;
    let creditsApplied = 0;
    let totalCreditAmount = 0;

    for (const student of students) {
      const classId = student.currentClassId;

      // Calculate fee from components
      const applicable = feeComponents.filter(
        (c) => c.scope === "school" || c.classId === classId,
      );
      let feeAmount = applicable.reduce((sum, c) => sum + Number(c.amount), 0);

      // Fallback to FeeSetting if no components
      if (!feeAmount && classId) {
        feeAmount = feeByClass.get(classId) || 0;
      }

      if (!feeAmount) continue; // skip students with no fee set

      // Check if invoice already exists for this student+term
      const existingInv = await prisma.invoice.findFirst({
        where: { schoolId, studentId: student.id, termId: id },
      });
      if (existingInv) continue;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          schoolId,
          studentId: student.id,
          termId: id,
          amount: feeAmount,
          status: "unpaid",
        },
      });
      invoicesCreated++;

      // Apply any available credits
      const { applied } = await applyCreditsToInvoice(
        schoolId,
        student.id,
        invoice.id,
      );

      if (applied > 0) {
        creditsApplied++;
        totalCreditAmount += applied;

        // Email guardian about credit carryover
        const guardian = student.guardians?.[0];
        if (guardian?.email) {
          try {
            await sendMail({
              to: guardian.email,
              subject: `Fee Credit Applied — ${activeTerm.name} ${activeTerm.year}`,
              html: `
                <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:24px">
                  <div style="background:#4F46E5;padding:16px;border-radius:8px 8px 0 0;color:#fff">
                    <b>${school?.name || "School"}</b>
                  </div>
                  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
                    <h2 style="color:#111827;margin:0 0 16px">Fee Credit Applied</h2>
                    <p>Dear ${guardian.name},</p>
                    <p>A credit of <b>MWK ${applied.toLocaleString()}</b> from a previous term has been automatically applied to
                    <b>${student.firstName} ${student.lastName}</b>'s fees for <b>${activeTerm.name} ${activeTerm.year}</b>.</p>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
                      <b style="color:#16a34a">MWK ${applied.toLocaleString()}</b>
                      <span style="color:#6b7280"> credited to ${activeTerm.name} ${activeTerm.year} invoice</span>
                    </div>
                    <p style="color:#6b7280;font-size:12px">
                      ${school?.name || "School"} • Automated notification
                    </p>
                  </div>
                </div>
              `,
              text: `Credit of MWK ${applied.toLocaleString()} applied to ${student.firstName} ${student.lastName}'s fees for ${activeTerm.name} ${activeTerm.year}.`,
            });
          } catch (mailErr) {
            console.error("Credit email failed:", mailErr.message);
          }
        }
      }
    }

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "term.activate",
      resource: "term",
      targetId: id,
      meta: { invoicesCreated, creditsApplied, totalCreditAmount },
    });

    res.json({
      ok: true,
      term: activeTerm,
      invoicesCreated,
      creditsApplied,
      totalCreditAmount,
      message: `Term activated. ${invoicesCreated} invoices created, ${creditsApplied} credits applied (MWK ${totalCreditAmount.toLocaleString()}).`,
    });
  } catch (e) {
    console.error("term.activate error:", e);
    res.status(500).json({ error: e.message });
  }
};

// GET /api/terms/:id/preview-activation
// Preview what will happen when term is activated
exports.previewActivation = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const term = await prisma.term.findFirst({ where: { id, schoolId } });
    if (!term) return res.status(404).json({ error: "Term not found" });

    const students = await prisma.student.findMany({
      where: { schoolId, status: "active", currentClassId: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentClassId: true,
      },
    });

    const feeComponents = await prisma.feeComponent.findMany({
      where: { schoolId, termId: id },
    });

    const feeSettings = await prisma.feeSetting.findMany({
      where: { schoolId, termId: id },
    });
    const feeByClass = new Map(
      feeSettings.map((f) => [f.classId, Number(f.amount)]),
    );

    let studentsWithFees = 0;
    let studentsWithCredit = 0;
    let totalInvoiceAmount = 0;
    let totalCreditToApply = 0;

    for (const student of students) {
      const classId = student.currentClassId;
      const applicable = feeComponents.filter(
        (c) => c.scope === "school" || c.classId === classId,
      );
      let feeAmount = applicable.reduce((sum, c) => sum + Number(c.amount), 0);
      if (!feeAmount && classId) feeAmount = feeByClass.get(classId) || 0;
      if (!feeAmount) continue;

      studentsWithFees++;
      totalInvoiceAmount += feeAmount;

      // Check credit
      const creditAgg = await prisma.studentCredit.aggregate({
        _sum: { amount: true },
        where: {
          schoolId,
          studentId: student.id,
          status: { in: ["available", "partial"] },
        },
      });
      const credit = Number(creditAgg._sum.amount || 0);
      if (credit > 0) {
        studentsWithCredit++;
        totalCreditToApply += Math.min(credit, feeAmount);
      }
    }

    res.json({
      data: {
        termName: `${term.name} ${term.year}`,
        studentsWithFees,
        studentsWithCredit,
        totalInvoiceAmount,
        totalCreditToApply,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
