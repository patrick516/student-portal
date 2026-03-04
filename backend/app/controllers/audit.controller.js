const { prisma } = require("../config/prisma");

// GET /api/audit?action=&resource=&userId=&limit=50
exports.list = async (req, res) => {
  const { action, resource, userId, limit } = req.query;
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        schoolId: req.user.schoolId,
        ...(action ? { action } : {}),
        ...(resource ? { resource } : {}),
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit || "50", 10), 200),
    });
    res.json({ data: logs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
