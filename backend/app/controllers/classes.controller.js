// backend/app/controllers/classes.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");
const { sendFormTeacherNotification } = require("../services/mail.service");

// GET /api/classes
exports.list = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: [{ name: "asc" }, { stream: "asc" }],
      include: {
        formTeacher: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ data: classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/classes
exports.create = async (req, res) => {
  try {
    const { name, stream, year } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });

    const klass = await prisma.class.create({
      data: {
        schoolId: req.user.schoolId,
        name,
        stream: stream || null,
        year: year || null,
      },
    });

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "class.create",
      resource: "class",
      targetId: klass.id,
    });

    res.status(201).json(klass);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/classes/:id/form-teacher  { teacherId }
exports.setFormTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body || {};
    if (!teacherId)
      return res.status(400).json({ error: "teacherId required" });

    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId: req.user.schoolId, role: "teacher" },
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const klass = await prisma.class.update({
      where: { id },
      data: { formTeacherId: teacherId },
      include: { formTeacher: true },
    });

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "class.set-form-teacher",
      resource: "class",
      targetId: id,
      meta: { teacherId },
    });

    // send email notification (ignore errors so UI is not blocked)
    const className =
      klass.name +
      (klass.stream ? " " + klass.stream : "") +
      (klass.year ? " • " + klass.year : "");
    try {
      await sendFormTeacherNotification({ to: teacher.email, className });
    } catch (err) {
      console.error("Form teacher email failed:", err.message);
    }

    res.json(klass);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/classes/:id/summary
exports.summary = async (req, res) => {
  try {
    const { id } = req.params;

    const ass = await prisma.teacherAssignment.findMany({
      where: { classId: id },
      select: {
        teacher: { select: { id: true, name: true, email: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    const map = new Map();
    for (const a of ass) {
      const t = a.teacher;
      if (!map.has(t.id)) {
        map.set(t.id, { teacher: t, subjects: [] });
      }
      map.get(t.id).subjects.push(a.subject);
    }

    res.json({ data: Array.from(map.values()) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/classes/my-form
exports.myFormClasses = async (req, res) => {
  try {
    const where = {
      schoolId: req.user.schoolId,
      ...(req.user.role === "teacher" ? { formTeacherId: req.user.id } : {}),
    };

    const classes = await prisma.class.findMany({
      where,
      orderBy: [{ name: "asc" }, { stream: "asc" }],
      include: {
        formTeacher: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ data: classes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
