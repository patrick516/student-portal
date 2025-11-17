// Role-based checks & class-scope checks
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: role required", need: roles });
    }
    next();
  };
}

/**
 * Require that the authenticated teacher has access to a specific class.
 * Usage: app.get('/api/classes/:classId/...', authRequired, requireTeacherClassAccess('classId'), handler)
 */
const { prisma } = require("../config/prisma");
function requireTeacherClassAccess(classIdParam = "classId") {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const classId =
        req.params[classIdParam] ||
        req.body[classIdParam] ||
        req.query[classIdParam];
      if (!classId)
        return res.status(400).json({ error: `Missing ${classIdParam}` });

      // Admins & bursars can be blocked or allowed depending on resource; here only teachers restricted by class
      if (req.user.role === "teacher") {
        const link = await prisma.teacherClass.findFirst({
          where: { teacherId: req.user.id, classId },
        });
        if (!link)
          return res.status(403).json({ error: "Forbidden: not your class" });
      }

      // Bursars should not access class academic data (we enforce per-route by role)
      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

module.exports = { requireRole, requireTeacherClassAccess };
