const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

exports.list = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const classId = (req.query.classId || "").trim();

    // base where
    const where = {
      schoolId: req.user.schoolId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { studentCode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(classId && { currentClassId: classId }),
    };

    // If user is teacher, restrict to their classes
    if (req.user.role === "teacher") {
      const links = await prisma.teacherClass.findMany({
        where: { teacherId: req.user.id },
        select: { classId: true },
      });
      const allowed = links.map((l) => l.classId);
      where.currentClassId = classId
        ? classId // already chosen; they must have access to it
        : { in: allowed.length ? allowed : ["__none__"] };
    }

    const students = await prisma.student.findMany({
      where,
      include: { currentClass: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    });

    const data = students.map((s) => ({
      id: s.id,
      student_code: s.studentCode,
      first_name: s.firstName,
      last_name: s.lastName,
      class_name: s.currentClass
        ? `${s.currentClass.name}${
            s.currentClass.stream ? " " + s.currentClass.stream : ""
          }`
        : null,
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { student_code, first_name, last_name, class_id } = req.body || {};
    if (!student_code || !first_name || !last_name) {
      return res
        .status(400)
        .json({ error: "student_code, first_name, last_name are required" });
    }

    const created = await prisma.student.create({
      data: {
        schoolId: req.user.schoolId,
        studentCode: student_code,
        firstName: first_name,
        lastName: last_name,
        currentClassId: class_id || null,
      },
      select: { id: true },
    });

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "student.create",
      resource: "student",
      targetId: created.id,
      meta: { student_code },
    });

    res.status(201).json({ id: created.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/students/:id
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { id, schoolId: req.user.schoolId },
      include: {
        currentClass: {
          select: { id: true, name: true, stream: true, year: true },
        },
      },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ data: student });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
