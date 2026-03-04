// backend/app/controllers/guardians.controller.js
const { prisma } = require("../config/prisma");

// GET /api/guardians?studentId=
exports.list = async (req, res) => {
  try {
    const { studentId } = req.query;
    const where = {
      schoolId: req.user.schoolId,
      ...(studentId ? { studentId } : {}),
    };
    const rows = await prisma.guardian.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/guardians  { studentId, name, email?, phone?, relation? }
exports.create = async (req, res) => {
  try {
    const { studentId, name, email, phone, relation } = req.body || {};
    if (!studentId || !name) {
      return res.status(400).json({ error: "studentId and name are required" });
    }
    const g = await prisma.guardian.create({
      data: {
        schoolId: req.user.schoolId,
        studentId,
        name,
        email: email || null,
        phone: phone || null,
        relation: relation || null,
      },
    });
    res.status(201).json(g);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/guardians/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, relation } = req.body || {};
    const g = await prisma.guardian.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(relation !== undefined ? { relation } : {}),
      },
    });
    res.json(g);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/guardians/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.guardian.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
