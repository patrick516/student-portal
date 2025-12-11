// backend/app/controllers/students.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

// ---------- helpers ----------

// Build prefix from school name (up to 3 initials).
// "Stance Academy" => "SA", "Future Trends Academy" => "FTA"
function buildStudentPrefix(schoolName) {
  if (!schoolName) return "STU";
  const parts = schoolName.split(/\s+/).filter(Boolean).slice(0, 3); // max 3 words

  if (!parts.length) return "STU";

  return parts.map((p) => p[0].toUpperCase()).join("");
}

// Return list of class IDs a teacher is allowed to see
async function getTeacherAllowedClassIds(userId, schoolId) {
  // classes where they are allocated via TeacherClass
  const links = await prisma.teacherClass.findMany({
    where: { teacherId: userId },
    select: { classId: true },
  });

  // classes where they are the form teacher
  const formClasses = await prisma.class.findMany({
    where: { schoolId, formTeacherId: userId },
    select: { id: true },
  });

  const set = new Set(
    [...links.map((l) => l.classId), ...formClasses.map((c) => c.id)].filter(
      Boolean
    )
  );

  return Array.from(set);
}

// Check if user is admin (headteacher)
function isAdmin(user) {
  return user.role === "admin";
}

// Check if user is teacher
function isTeacher(user) {
  return user.role === "teacher";
}

// Check if user is bursar
function isBursar(user) {
  return user.role === "bursar";
}

// ---------- list students ----------

// GET /api/students?search=&classId=
exports.list = async (req, res) => {
  try {
    await prisma.student.updateMany({
      where: {
        schoolId: req.user.schoolId,
        status: "suspended",
        suspensionUntil: { lt: new Date() },
      },
      data: { status: "active", suspensionUntil: null },
    });

    const search = (req.query.search || "").trim();
    const classId = (req.query.classId || "").trim();
    const schoolId = req.user.schoolId;

    // auto-clear expired suspensions

    // base where
    const where = {
      schoolId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { studentCode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(classId && { currentClassId: classId }),
    };

    // If user is teacher, restrict to their classes (both allocated + form teacher)
    if (isTeacher(req.user)) {
      const allowed = await getTeacherAllowedClassIds(req.user.id, schoolId);
      where.currentClassId = classId
        ? classId // already chosen; they must have access to it via backend protection elsewhere
        : { in: allowed.length ? allowed : ["__none__"] };
    }

    const students = await prisma.student.findMany({
      where,
      include: { currentClass: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
    });

    // We return both camelCase and snake_case fields
    // so new + old frontends can work.
    const data = students.map((s) => {
      const klass = s.currentClass;
      const className = klass
        ? `${klass.name}${klass.stream ? " " + klass.stream : ""}${
            klass.year ? " • " + klass.year : ""
          }`
        : null;

      return {
        // new shape
        id: s.id,
        studentCode: s.studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
        status: s.status,
        class: klass
          ? {
              id: klass.id,
              name: klass.name,
              stream: klass.stream,
              year: klass.year,
            }
          : null,

        // old shape (backwards compat)
        student_code: s.studentCode,
        first_name: s.firstName,
        last_name: s.lastName,
        class_name: className,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("students.list error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------- create student (auto code + role rules) ----------

// POST /api/students
exports.create = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    // support both new + old request shapes
    const {
      firstName,
      middleName,
      lastName,
      phone,
      nationalId,
      dateOfBirth,
      currentClassId,
      guardian,

      // old snake_case keys (ignored for code generation, but supported)
      first_name,
      last_name,
      class_id,
    } = req.body || {};

    const effFirstName = (firstName || first_name || "").trim();
    const effLastName = (lastName || last_name || "").trim();
    const effClassId = currentClassId || class_id || null;

    if (!effFirstName || !effLastName || !effClassId) {
      return res.status(400).json({
        error: "firstName, lastName and class are required",
      });
    }

    // Permissions:
    // - admin can add any student
    // - teacher can only add if he/she is form teacher for that class
    // - bursar cannot add students
    if (isBursar(req.user)) {
      return res.status(403).json({
        error: "Bursar cannot register students.",
      });
    }

    if (isTeacher(req.user)) {
      const klass = await prisma.class.findFirst({
        where: { id: effClassId, schoolId },
        select: { formTeacherId: true },
      });
      if (!klass || klass.formTeacherId !== req.user.id) {
        return res.status(403).json({
          error:
            "Only the form teacher for this class or the Head Teacher can add students here.",
        });
      }
    }

    // get school name for prefix
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    const prefix = buildStudentPrefix(school?.name);

    // generate next studentCode with small retry in case of collisions
    let studentCode = "";
    let attempts = 0;

    while (attempts < 5) {
      const count = await prisma.student.count({
        where: { schoolId },
      });

      const nextNumber = count + 1 + attempts; // small offset per retry
      const padded = String(nextNumber).padStart(4, "0");
      studentCode = `${prefix}${padded}`;

      try {
        const student = await prisma.student.create({
          data: {
            schoolId,
            studentCode,
            firstName: effFirstName,
            lastName: effLastName,
            status: "active",
            currentClassId: effClassId,
            // NOTE: phone, nationalId, dateOfBirth are not in schema yet.
            // When you add them to Prisma, you can plug them in here.
          },
        });

        // Optional: create guardian if provided
        if (guardian && (guardian.name || guardian.phone || guardian.email)) {
          await prisma.guardian.create({
            data: {
              schoolId,
              studentId: student.id,
              name: guardian.name || "Guardian",
              email: guardian.email || null,
              phone: guardian.phone || null,
              relation: guardian.relation || null,
            },
          });
        }

        await logAudit({
          schoolId,
          userId: req.user.id,
          action: "student.create",
          resource: "student",
          targetId: student.id,
          meta: { studentCode },
        });

        return res.status(201).json({ data: student });
      } catch (err) {
        // unique constraint on studentCode
        if (err.code === "P2002" && err.meta?.target?.includes("studentCode")) {
          attempts += 1;
          continue;
        }
        console.error("students.create error:", err);
        return res.status(500).json({ error: "Failed to create student" });
      }
    }

    return res
      .status(500)
      .json({ error: "Could not generate unique student code" });
  } catch (err) {
    console.error("students.create error (outer):", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------- get one student (with basic info) ----------

// GET /api/students/:id
exports.getOne = async (req, res) => {
  try {
    await prisma.student.updateMany({
      where: {
        id,
        schoolId,
        status: "suspended",
        suspensionUntil: { lt: new Date() },
      },
      data: { status: "active", suspensionUntil: null },
    });

    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        currentClass: {
          select: { id: true, name: true, stream: true, year: true },
        },
      },
    });

    if (!student) return res.status(404).json({ error: "Student not found" });

    // If teacher, ensure they are allowed to see this student's class
    if (isTeacher(req.user) && student.currentClassId) {
      const allowed = await getTeacherAllowedClassIds(req.user.id, schoolId);
      if (!allowed.includes(student.currentClassId)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    res.json({ data: student });
  } catch (e) {
    console.error("students.getOne error:", e);
    res.status(500).json({ error: e.message });
  }
};

// ---------- suspend student ----------

// POST /api/students/:id/suspend  { days, reason }
exports.suspend = async (req, res) => {
  try {
    const { id } = req.params;
    const { days, reason } = req.body || {};
    const schoolId = req.user.schoolId;

    const numDays = Number(days);
    if (!numDays || numDays <= 0) {
      return res.status(400).json({ error: "days must be > 0" });
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: { currentClass: true },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Only admin or form teacher of that class can suspend
    if (!isAdmin(req.user)) {
      if (!isTeacher(req.user)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!student.currentClassId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const klass = await prisma.class.findFirst({
        where: { id: student.currentClassId, schoolId },
        select: { formTeacherId: true },
      });
      if (!klass || klass.formTeacherId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const until = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { status: "suspended", suspensionUntil: until },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "student.suspend",
      resource: "student",
      targetId: updated.id,
      meta: { days: numDays, reason, until: until.toISOString() },
    });

    res.json({ data: updated });
  } catch (e) {
    console.error("students.suspend error:", e);
    res.status(500).json({ error: e.message });
  }
};

// ---------- dismiss student ----------

// POST /api/students/:id/dismiss  { reason }
exports.dismiss = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const schoolId = req.user.schoolId;

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: { currentClass: true },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Only admin or form teacher of that class can dismiss
    if (!isAdmin(req.user)) {
      if (!isTeacher(req.user)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!student.currentClassId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const klass = await prisma.class.findFirst({
        where: { id: student.currentClassId, schoolId },
        select: { formTeacherId: true },
      });
      if (!klass || klass.formTeacherId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { status: "dismissed" },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "student.dismiss",
      resource: "student",
      targetId: updated.id,
      meta: { reason },
    });

    // Here you would also send guardian notification via mail/SMS service.

    res.json({ data: updated });
  } catch (e) {
    console.error("students.dismiss error:", e);
    res.status(500).json({ error: e.message });
  }
};

// ---------- delete student ----------

// DELETE /api/students/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    // Only admin can delete
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Only Head Teacher can delete." });
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    await prisma.student.delete({ where: { id: student.id } });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "student.delete",
      resource: "student",
      targetId: student.id,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("students.remove error:", e);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/students/:id/unsuspend
exports.unsuspend = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: { currentClass: true },
    });
    if (!student) return res.status(404).json({ error: "Student not found" });

    // Only admin or form teacher of that class can unsuspend
    if (!isAdmin(req.user)) {
      if (!isTeacher(req.user)) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (!student.currentClassId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const klass = await prisma.class.findFirst({
        where: { id: student.currentClassId, schoolId },
        select: { formTeacherId: true },
      });
      if (!klass || klass.formTeacherId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { status: "active", suspensionUntil: null },
    });

    await logAudit({
      schoolId,
      userId: req.user.id,
      action: "student.unsuspend",
      resource: "student",
      targetId: updated.id,
    });

    res.json({ data: updated });
  } catch (e) {
    console.error("students.unsuspend error:", e);
    res.status(500).json({ error: e.message });
  }
};
