const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");

// normalize yyyy-mm-dd to a Date at midnight UTC (or keep local if you prefer)
function dateOnly(input) {
  const d = new Date(input);
  // zero time to keep one row per day
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

// helper: normalize to UTC midnight
function dateOnly(input) {
  const d = new Date(input);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

// NEW: only allow today or yesterday (UTC)
function isEditableDay(day /* Date */) {
  const now = new Date();
  const today = dateOnly(now.toISOString().slice(0, 10));
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  return (
    day.getTime() === today.getTime() || day.getTime() === yesterday.getTime()
  );
}

// GET /api/attendance?classId=...&date=YYYY-MM-DD
// List students in class + their attendance status for that date
exports.listForClass = async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date)
      return res.status(400).json({ error: "classId and date are required" });
    const day = dateOnly(date);

    // students in class (active)
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

    // existing marks for that day
    const marks = await prisma.attendance.findMany({
      where: { schoolId: req.user.schoolId, classId, date: day },
      select: { studentId: true, status: true },
    });
    const byStudent = new Map(marks.map((m) => [m.studentId, m.status]));

    const data = students.map((s) => ({
      id: s.id,
      student_code: s.studentCode,
      name: `${s.firstName} ${s.lastName}`,
      status: byStudent.get(s.id) || null,
    }));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/attendance/mark-all { classId, date, status }
exports.markAll = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res
        .status(403)
        .json({ error: "Only teachers can record attendance" });
    const { classId, date, status } = req.body || {};
    if (!classId || !date || !status)
      return res.status(400).json({ error: "classId, date, status required" });
    if (!["present", "absent", "late"].includes(status))
      return res.status(400).json({ error: "invalid status" });
    const day = dateOnly(date);

    // 🚫 only today or yesterday
    if (!isEditableDay(day))
      return res
        .status(403)
        .json({ error: "You can only mark attendance for today or yesterday" });

    // students in class (all statuses)
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.user.schoolId,
        currentClassId: classId,
        // we include suspended/dismissed so they appear;
        // later we can disable marking for them on the frontend
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

    const ops = students.map((s) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: s.id, date: day } },
        create: {
          schoolId: req.user.schoolId,
          studentId: s.id,
          classId,
          date: day,
          status,
        },
        update: { status },
      })
    );
    await prisma.$transaction(ops);

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "attendance.mark-all",
      resource: "attendance",
      meta: {
        classId,
        date: day.toISOString(),
        status,
        count: students.length,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/attendance/mark { studentId, classId, date, status }
exports.markOne = async (req, res) => {
  try {
    if (req.user.role !== "teacher")
      return res
        .status(403)
        .json({ error: "Only teachers can record attendance" });
    const { studentId, classId, date, status } = req.body || {};
    if (!studentId || !classId || !date || !status)
      return res
        .status(400)
        .json({ error: "studentId, classId, date, status required" });
    if (!["present", "absent", "late"].includes(status))
      return res.status(400).json({ error: "invalid status" });
    const day = dateOnly(date);

    // 🚫 only today or yesterday
    if (!isEditableDay(day))
      return res
        .status(403)
        .json({ error: "You can only mark attendance for today or yesterday" });

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        currentClassId: classId,
        schoolId: req.user.schoolId,
      },
    });
    if (!student)
      return res.status(404).json({ error: "Student not in class" });

    await prisma.attendance.upsert({
      where: { studentId_date: { studentId, date: day } },
      create: {
        schoolId: req.user.schoolId,
        studentId,
        classId,
        date: day,
        status,
      },
      update: { status },
    });

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "attendance.mark-one",
      resource: "attendance",
      targetId: studentId,
      meta: { classId, date: day.toISOString(), status },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/attendance/summary?classId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.summary = async (req, res) => {
  try {
    const { classId, from, to } = req.query;
    if (!classId || !from || !to)
      return res.status(400).json({ error: "classId, from, to required" });
    const fromD = dateOnly(from);
    const toD = dateOnly(to);

    const agg = await prisma.attendance.groupBy({
      by: ["date", "status"],
      where: {
        schoolId: req.user.schoolId,
        classId,
        date: { gte: fromD, lte: toD },
      },
      _count: { _all: true },
    });
    res.json({ data: agg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/attendance/student-summary?studentId=&classId=&from=&to=
exports.studentSummary = async (req, res) => {
  try {
    const { studentId, classId, from, to } = req.query;
    if (!studentId)
      return res.status(400).json({ error: "studentId is required" });

    // default: last 30 days
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = from ? new Date(from) : thirtyAgo;
    const toDate = to ? new Date(to) : now;

    const rows = await prisma.attendance.findMany({
      where: {
        schoolId: req.user.schoolId,
        studentId,
        ...(classId ? { classId } : {}),
        date: { gte: fromDate, lte: toDate },
      },
      select: { status: true },
    });

    const summary = { present: 0, absent: 0, late: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "present") summary.present++;
      else if (r.status === "absent") summary.absent++;
      else if (r.status === "late") summary.late++;
    }

    res.json({ data: summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
