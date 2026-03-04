// backend/app/controllers/exams.controller.js
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

const { sendExamResultsEmail } = require("../services/mail.service");

// Utility: ensure teacher assignment for class+subject

async function ensureTeacherAccess(userId, classId, subjectId) {
  const link = await prisma.teacherAssignment.findFirst({
    where: { teacherId: userId, classId, subjectId },
  });
  return !!link;
}

// GET /api/exams/my-subjects  (teacher only)

exports.mySubjects = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Teacher only" });
    }

    const rows = await prisma.teacherAssignment.findMany({
      where: { teacherId: req.user.id },
      select: {
        klass: { select: { id: true, name: true, stream: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ classId: "asc" }],
    });

    const data = rows.map((r) => ({
      classId: r.klass.id,
      className: `${r.klass.name}${r.klass.stream ? " " + r.klass.stream : ""}`,
      subjectId: r.subject.id,
      subjectName: r.subject.name,
      subjectCode: r.subject.code || null,
    }));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/exams/assessments?classId=&subjectId=

exports.listAssessments = async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const where = {
      schoolId: req.user.schoolId,
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
    };
    const items = await prisma.assessment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });
    res.json({ data: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/exams/assessments
// body: { classId, subjectId, name, weight, optional? }
// (teacher/admin)

exports.createAssessment = async (req, res) => {
  try {
    const { classId, subjectId, name, weight, optional } = req.body || {};
    if (!classId || !subjectId || !name || typeof weight !== "number") {
      return res
        .status(400)
        .json({ error: "classId, subjectId, name, weight required" });
    }

    if (req.user.role === "teacher") {
      const ok = await ensureTeacherAccess(req.user.id, classId, subjectId);
      if (!ok) {
        return res.status(403).json({ error: "Not your subject/class" });
      }
    }

    const item = await prisma.assessment.create({
      data: {
        schoolId: req.user.schoolId,
        classId,
        subjectId,
        name,
        weight,
        optional: !!optional,
        createdBy: req.user.id,
      },
    });

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "exams.assessment.create",
      resource: "assessment",
      targetId: item.id,
    });

    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/exams/marks?classId=&subjectId=&assessmentId=
// -> list students + marks

exports.listMarks = async (req, res) => {
  try {
    const { classId, subjectId, assessmentId } = req.query;
    if (!classId || !subjectId || !assessmentId) {
      return res
        .status(400)
        .json({ error: "classId, subjectId, assessmentId required" });
    }

    // students in class (all statuses)
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.user.schoolId,
        currentClassId: classId,
        // no status filter: show everyone in that class
      },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        status: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const marks = await prisma.mark.findMany({
      where: { schoolId: req.user.schoolId, classId, subjectId, assessmentId },
      select: { studentId: true, score: true },
    });

    const map = new Map(marks.map((m) => [m.studentId, Number(m.score || 0)]));

    const data = students.map((s) => ({
      id: s.id,
      code: s.studentCode,
      name: `${s.firstName} ${s.lastName}`,
      score: map.has(s.id) ? map.get(s.id) : null,
    }));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/exams/mark
// body: { classId, subjectId, assessmentId, studentId, score } (teacher only)

exports.saveMark = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Teacher only" });
    }

    const { classId, subjectId, assessmentId, studentId, score } =
      req.body || {};

    if (
      !classId ||
      !subjectId ||
      !assessmentId ||
      !studentId ||
      score === undefined
    ) {
      return res.status(400).json({
        error: "classId, subjectId, assessmentId, studentId, score required",
      });
    }

    const ok = await ensureTeacherAccess(req.user.id, classId, subjectId);
    if (!ok) {
      return res.status(403).json({ error: "Not your subject/class" });
    }

    await prisma.mark.upsert({
      where: { studentId_assessmentId: { studentId, assessmentId } },
      create: {
        schoolId: req.user.schoolId,
        classId,
        subjectId,
        studentId,
        teacherId: req.user.id,
        assessmentId,
        score,
      },
      update: { score },
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/exams/gradescheme
// body: { classId, bands: [{min,max,grade,points}] }
// (form teacher only; admin allowed)

exports.setGradeScheme = async (req, res) => {
  try {
    const { classId, bands } = req.body || {};
    if (!classId || !Array.isArray(bands) || bands.length === 0) {
      return res.status(400).json({ error: "classId and bands[] required" });
    }

    const klass = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
      select: { formTeacherId: true },
    });
    if (!klass) return res.status(404).json({ error: "Class not found" });

    if (!(req.user.role === "admin" || req.user.id === klass.formTeacherId)) {
      return res.status(403).json({ error: "Only form teacher or admin" });
    }

    const gs = await prisma.gradeScheme.upsert({
      where: { classId },
      create: {
        schoolId: req.user.schoolId,
        classId,
        createdBy: req.user.id,
        bands,
      },
      update: { bands },
    });

    res.json(gs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/exams/results/class/:classId
// -> totals, grades, points (form teacher/admin view)

// GET /api/exams/results/class/:classId  -> computed totals, grades, points (form teacher/admin view)
exports.classResults = async (req, res) => {
  try {
    const { classId } = req.params;

    const klass = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
      select: { formTeacherId: true },
    });
    if (!klass) return res.status(404).json({ error: "Class not found" });

    if (!(req.user.role === "admin" || req.user.id === klass.formTeacherId)) {
      return res.status(403).json({ error: "Only form teacher or admin" });
    }

    // students
    // students in class (all statuses)
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.user.schoolId,
        currentClassId: classId,
        // no status filter: show everyone in that class
      },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        status: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    if (!students.length) return res.json({ data: [] });

    // assessments for class
    const assessments = await prisma.assessment.findMany({
      where: { schoolId: req.user.schoolId, classId },
      select: {
        id: true,
        subjectId: true,
        name: true,
        weight: true,
        optional: true,
      },
    });
    if (!assessments.length) return res.json({ data: [] });

    // load marks for class
    const marks = await prisma.mark.findMany({
      where: { schoolId: req.user.schoolId, classId },
      select: {
        studentId: true,
        subjectId: true,
        assessmentId: true,
        score: true,
      },
    });

    // aggregate scores by student+subject
    const byStudent = new Map();
    for (const m of marks) {
      const a = assessments.find((x) => x.id === m.assessmentId);
      if (!a) continue;
      const sKey = m.studentId;
      if (!byStudent.has(sKey)) byStudent.set(sKey, new Map()); // subjectId -> total
      const subjMap = byStudent.get(sKey);
      const prev = subjMap.get(m.subjectId) || 0;
      const weighted = (Number(m.score || 0) * a.weight) / 100.0;
      subjMap.set(m.subjectId, prev + weighted);
    }

    // subject metadata (names/codes)
    const subjectIds = Array.from(new Set(assessments.map((a) => a.subjectId)));
    const subs = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true, code: true },
    });
    const subjectMap = new Map();
    for (const s of subs) {
      subjectMap.set(s.id, { name: s.name, code: s.code || null });
    }

    // grade scheme
    const gs = await prisma.gradeScheme.findUnique({ where: { classId } });
    if (!gs) {
      return res
        .status(400)
        .json({ error: "Grade scheme not set for this class" });
    }

    const rawBands = Array.isArray(gs.bands) ? gs.bands : [];
    const bands = rawBands.map((b) => ({
      min: Number(b && b.min != null ? b.min : 0),
      max: Number(b && b.max != null ? b.max : 0),
      grade: b && b.grade != null ? String(b.grade) : "F",
      points: Number(b && b.points != null ? b.points : 9),
    }));

    function toGradePoints(score) {
      for (const b of bands) {
        if (score >= b.min && score <= b.max) {
          return { grade: b.gRADE || b.grade, points: b.points };
        }
      }
      return { grade: "F", points: 9 };
    }

    // compute per student
    const results = students.map((st) => {
      const subjTotalsMap = byStudent.get(st.id) || new Map();
      const subjTotals = Array.from(subjTotalsMap.entries()); // [subjectId, totalScore]

      const evaluated = subjTotals.map(([subjectId, total]) => {
        const meta = subjectMap.get(subjectId) || {
          name: subjectId,
          code: null,
        };
        const gp = toGradePoints(total);
        return {
          subjectId,
          subjectName: meta.name,
          subjectCode: meta.code,
          total: Math.round(total),
          grade: gp.grade,
          points: gp.points,
        };
      });

      const sortedByPoints = [...evaluated].sort(
        (a, b) => a.points - b.points || b.total - a.total
      );
      const bestSix = sortedByPoints.slice(0, 6);
      const totalPoints = bestSix.reduce((s, x) => s + x.points, 0);
      const totalMarks = bestSix.reduce((s, x) => s + x.total, 0);
      const passed = bestSix.length === 6;

      return {
        studentId: st.id,
        studentCode: st.studentCode,
        name: `${st.firstName} ${st.lastName}`,
        subjects: evaluated,
        bestSix,
        totalPoints,
        totalMarks,
        passed,
      };
    });

    results.sort(
      (a, b) => a.totalPoints - b.totalPoints || b.totalMarks - a.totalMarks
    );

    res.json({ data: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/exams/send-results-email
// body: { classId, studentId }
exports.sendResultsEmail = async (req, res) => {
  try {
    const { classId, studentId } = req.body || {};
    if (!classId || !studentId) {
      return res
        .status(400)
        .json({ error: "classId and studentId are required" });
    }

    // only admin or form teacher for that class
    const klass = await prisma.class.findFirst({
      where: { id: classId, schoolId: req.user.schoolId },
      include: { formTeacher: true },
    });
    if (!klass) return res.status(404).json({ error: "Class not found" });

    if (!(req.user.role === "admin" || req.user.id === klass.formTeacherId)) {
      return res
        .status(403)
        .json({ error: "Only form teacher or admin can send results emails" });
    }

    // students in this class (all statuses)
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.user.schoolId,
        currentClassId: classId,
        // no status filter: they'll all appear in results lists,
        // but only those with marks will get scores.
      },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    const target = students.find((s) => s.id === studentId);
    if (!target)
      return res.status(404).json({ error: "Student not found in this class" });

    const assessments = await prisma.assessment.findMany({
      where: { schoolId: req.user.schoolId, classId },
      select: {
        id: true,
        subjectId: true,
        name: true,
        weight: true,
        optional: true,
      },
    });
    if (!assessments.length)
      return res.status(400).json({ error: "No assessments found" });

    const marks = await prisma.mark.findMany({
      where: { schoolId: req.user.schoolId, classId, studentId },
      select: { subjectId: true, assessmentId: true, score: true },
    });

    const subjectTotalsMap = new Map();
    for (const m of marks) {
      const a = assessments.find((x) => x.id === m.assessmentId);
      if (!a) continue;
      const prev = subjectTotalsMap.get(m.subjectId) || 0;
      const weighted = (Number(m.score || 0) * a.weight) / 100.0;
      subjectTotalsMap.set(m.subjectId, prev + weighted);
    }

    const gs = await prisma.gradeScheme.findUnique({ where: { classId } });
    if (!gs)
      return res
        .status(400)
        .json({ error: "Grade scheme not set for this class" });

    const rawBands = Array.isArray(gs.bands) ? gs.bands : [];
    const bands = rawBands.map((b) => ({
      min: Number(b && b.min != null ? b.min : 0),
      max: Number(b && b.max != null ? b.max : 0),
      grade: b && b.grade != null ? String(b.grade) : "F",
      points: Number(b && b.points != null ? b.points : 9),
    }));

    function toGradePoints(score) {
      for (const b of bands) {
        if (score >= b.min && score <= b.max)
          return { grade: b.grade, points: b.points };
      }
      return { grade: "F", points: 9 };
    }

    // subject results for this student
    const subjectIds = Array.from(subjectTotalsMap.keys());
    const subjectEntities = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true },
    });

    const evaluated = subjectIds.map((sid) => {
      const total = subjectTotalsMap.get(sid) || 0;
      const gp = toGradePoints(total);
      const subj = subjectEntities.find((s) => s.id === sid);
      return {
        subjectId: sid,
        subjectName: subj ? subj.name : "",
        total: Math.round(total),
        grade: gp.grade,
        points: gp.points,
      };
    });

    const sortedByPoints = [...evaluated].sort(
      (a, b) => a.points - b.points || b.total - a.total
    );
    const bestSix = sortedByPoints.slice(0, 6);
    const totalPoints = bestSix.reduce((s, x) => s + x.points, 0);
    const totalMarks = bestSix.reduce((s, x) => s + x.total, 0);
    const passed = bestSix.length === 6;

    // guardians with email
    const guardians = await prisma.guardian.findMany({
      where: { schoolId: req.user.schoolId, studentId, NOT: { email: null } },
    });
    if (!guardians.length) {
      return res
        .status(400)
        .json({ error: "No guardians with email for this student" });
    }

    const className = `${klass.name}${klass.stream ? " " + klass.stream : ""}${
      klass.year ? " • " + klass.year : ""
    }`;
    const studentName = `${target.firstName} ${target.lastName}`;

    // send to all guardian emails
    await Promise.all(
      guardians
        .filter((g) => !!g.email)
        .map((g) =>
          sendExamResultsEmail({
            to: g.email,
            studentName,
            className,
            totalPoints,
            totalMarks,
            passed,
            subjects: evaluated,
          })
        )
    );

    res.json({ ok: true, recipients: guardians.map((g) => g.email) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
