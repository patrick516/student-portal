const { prisma } = require("../config/prisma");

// GET /api/subjects
exports.list = async (req, res) => {
  try {
    const items = await prisma.subject.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ name: "asc" }],
    });
    res.json({ data: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/subjects { name, code? }
exports.create = async (req, res) => {
  try {
    const { name, code } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });
    const s = await prisma.subject.create({
      data: { schoolId: req.user.schoolId, name, code: code || null },
    });
    res.status(201).json(s);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
