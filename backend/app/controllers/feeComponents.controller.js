// backend/app/controllers/feeComponents.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

// GET /api/fee-components?termId=&classId=
exports.list = async (req, res) => {
  try {
    const { termId, classId } = req.query;
    const schoolId = req.user.schoolId;

    const where = {
      schoolId,
      ...(termId ? { termId } : {}),
    };

    const components = await prisma.feeComponent.findMany({
      where,
      orderBy: [{ createdAt: "asc" }],
    });

    // If classId provided, filter to school-wide + that class only
    const filtered = classId
      ? components.filter((c) => c.scope === "school" || c.classId === classId)
      : components;

    // Attach class name for display
    const classIds = [
      ...new Set(filtered.map((c) => c.classId).filter(Boolean)),
    ];
    const classes =
      classIds.length > 0
        ? await prisma.class.findMany({
            where: { id: { in: classIds } },
            select: { id: true, name: true, stream: true },
          })
        : [];

    const classMap = new Map(classes.map((c) => [c.id, c]));

    const result = filtered.map((c) => ({
      ...c,
      amount: Number(c.amount),
      className: c.classId ? classMap.get(c.classId)?.name || null : null,
      classStream: c.classId ? classMap.get(c.classId)?.stream || null : null,
    }));

    res.json({ data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/fee-components
// { termId, name, amount, optional, scope, classId? }
exports.create = async (req, res) => {
  try {
    const { termId, name, amount, optional, scope, classId } = req.body || {};
    const schoolId = req.user.schoolId;

    if (!termId || !name || amount === undefined) {
      return res
        .status(400)
        .json({ error: "termId, name, amount are required" });
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: "Amount must be > 0" });
    }

    const scopeSafe = scope === "class" ? "class" : "school";
    if (scopeSafe === "class" && !classId) {
      return res
        .status(400)
        .json({ error: "classId required when scope is class" });
    }

    const component = await prisma.feeComponent.create({
      data: {
        schoolId,
        termId,
        name: name.trim(),
        amount: amt,
        optional: optional === true || optional === "true",
        scope: scopeSafe,
        classId: scopeSafe === "class" ? classId : null,
      },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.component.create",
      resource: "feeComponent",
      targetId: component.id,
      meta: { name, amount: amt, scope: scopeSafe, classId },
    });

    res
      .status(201)
      .json({ data: { ...component, amount: Number(component.amount) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/fee-components/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, optional, scope, classId } = req.body || {};
    const schoolId = req.user.schoolId;

    const existing = await prisma.feeComponent.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Fee component not found" });
    }

    const data = {};
    if (name) data.name = name.trim();
    if (amount !== undefined) data.amount = Number(amount);
    if (optional !== undefined)
      data.optional = optional === true || optional === "true";
    if (scope) {
      data.scope = scope === "class" ? "class" : "school";
      data.classId =
        data.scope === "class" ? classId || existing.classId : null;
    }

    const updated = await prisma.feeComponent.update({
      where: { id },
      data,
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.component.update",
      resource: "feeComponent",
      targetId: id,
      meta: data,
    });

    res.json({ data: { ...updated, amount: Number(updated.amount) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/fee-components/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const existing = await prisma.feeComponent.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Fee component not found" });
    }

    await prisma.feeComponent.delete({ where: { id } });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "fees.component.delete",
      resource: "feeComponent",
      targetId: id,
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/fee-components/calculate?termId=&classId=
// Returns total fee for a student in a class for a term
exports.calculate = async (req, res) => {
  try {
    const { termId, classId } = req.query;
    const schoolId = req.user.schoolId;

    if (!termId) {
      return res.status(400).json({ error: "termId required" });
    }

    const components = await prisma.feeComponent.findMany({
      where: {
        schoolId,
        termId,
        OR: [
          { scope: "school" },
          { scope: "class", classId: classId || undefined },
        ],
      },
    });

    const total = components.reduce((sum, c) => sum + Number(c.amount), 0);
    const breakdown = components.map((c) => ({
      id: c.id,
      name: c.name,
      amount: Number(c.amount),
      optional: c.optional,
      scope: c.scope,
      classId: c.classId,
    }));

    res.json({ data: { total, breakdown } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
