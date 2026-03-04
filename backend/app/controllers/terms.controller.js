const { prisma } = require("../config/prisma");

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

// POST /api/terms  { name, year, startDate, endDate }
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
      },
    });
    res.status(201).json(term);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
