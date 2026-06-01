// backend/app/controllers/settings.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

// GET /api/auth/school-info  (PUBLIC — no auth required)
exports.publicSchoolInfo = async (req, res) => {
  try {
    // Get the first school in the system
    const school = await prisma.school.findFirst({
      select: {
        name: true,
        logoUrl: true,
        motto: true,
        address: true,
      },
    });
    res.json({ data: school || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        motto: true,
        logoUrl: true,
        createdAt: true,
      },
    });
    if (!school) return res.status(404).json({ error: "School not found" });
    res.json({ data: school });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const { name, address, phone, email, motto, logoUrl } = req.body || {};

    const data = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof address === "string") data.address = address.trim();
    if (typeof phone === "string") data.phone = phone.trim();
    if (typeof email === "string") data.email = email.trim();
    if (typeof motto === "string") data.motto = motto.trim();
    if (typeof logoUrl === "string") data.logoUrl = logoUrl.trim();

    const school = await prisma.school.update({
      where: { id: req.user.schoolId },
      data,
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

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "settings.update",
      resource: "school",
      targetId: school.id,
      meta: { fields: Object.keys(data) },
    });

    res.json({ data: school });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
