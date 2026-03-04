// backend/app/controllers/feeSettings.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

// GET /api/fee-settings?termId=&classId=
exports.list = async (req, res) => {
  try {
    const { termId, classId } = req.query;
    const where = {
      schoolId: req.user.schoolId,
      ...(termId ? { termId } : {}),
      ...(classId ? { classId } : {}),
    };

    const rows = await prisma.feeSetting.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
    });

    res.json({ data: rows });
  } catch (e) {
    console.error("feeSettings.list error:", e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/fee-settings  { termId, classId, amount }
exports.upsert = async (req, res) => {
  try {
    const { termId, classId, amount } = req.body || {};

    if (!termId || !classId || amount === undefined) {
      return res
        .status(400)
        .json({ error: "termId, classId, amount are required" });
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: "Amount must be > 0" });
    }

    const schoolId = req.user.schoolId;

    const feeSetting = await prisma.feeSetting.upsert({
      where: {
        schoolId_termId_classId: { schoolId, termId, classId },
      },
      create: {
        schoolId,
        termId,
        classId,
        amount: amt,
      },
      update: {
        amount: amt,
      },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.fee-setting.upsert",
      resource: "feeSetting",
      targetId: feeSetting.id,
      meta: { termId, classId, amount: amt },
    });

    res.json({ data: feeSetting });
  } catch (e) {
    console.error("feeSettings.upsert error:", e);
    res.status(500).json({ error: e.message });
  }
};
