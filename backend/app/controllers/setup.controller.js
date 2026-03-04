// backend/app/controllers/setup.controller.js
const { prisma } = require("../config/prisma");
const bcrypt = require("bcrypt");

// POST /api/setup/seed-school  (already existed in your project – keep if you had it)
exports.seedSchool = async (_req, res) => {
  try {
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: { name: "Demo School" },
      });
    }
    res.json({ ok: true, school });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/setup/seed-classes
exports.seedClasses = async (_req, res) => {
  try {
    const school = await prisma.school.findFirst();
    if (!school)
      return res.status(400).json({ error: "No school. Seed school first." });

    const payload = [
      { name: "Form 1", stream: "A", year: new Date().getFullYear() },
      { name: "Form 2", stream: "A", year: new Date().getFullYear() },
      { name: "Form 3", stream: "A", year: new Date().getFullYear() },
    ];

    const created = [];

    for (const p of payload) {
      // Check if class with same name+stream already exists
      const existing = await prisma.class.findFirst({
        where: { schoolId: school.id, name: p.name, stream: p.stream || null },
      });

      let klass;
      if (existing) {
        klass = existing;
      } else {
        klass = await prisma.class.create({
          data: { schoolId: school.id, ...p },
        });
      }
      created.push(klass);
    }

    res.json({ ok: true, classes: created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/setup/seed-students  { perClass?: number }
exports.seedStudents = async (req, res) => {
  try {
    const perClass = Math.max(
      1,
      Math.min(50, Number(req.body?.perClass || 10))
    );
    const school = await prisma.school.findFirst();
    if (!school)
      return res.status(400).json({ error: "No school. Seed school first." });

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
    });
    if (!classes.length)
      return res.status(400).json({ error: "No classes. Seed classes first." });

    let counter = 1;

    for (const klass of classes) {
      for (let i = 0; i < perClass; i++) {
        const code = `ST-${new Date().getFullYear()}-${String(counter).padStart(
          4,
          "0"
        )}`;

        const existing = await prisma.student.findFirst({
          where: { schoolId: school.id, studentCode: code },
        });

        if (!existing) {
          await prisma.student.create({
            data: {
              schoolId: school.id,
              studentCode: code,
              firstName: `Student${counter}`,
              lastName: `Test${klass.name.replace(/\s/g, "")}${
                klass.stream || ""
              }`,
              status: "active",
              currentClassId: klass.id,
            },
          });
        }

        counter++;
      }
    }

    res.json({ ok: true, seeded: counter - 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/setup/seed-teachers
exports.seedTeachers = async (_req, res) => {
  try {
    const school = await prisma.school.findFirst();
    if (!school)
      return res.status(400).json({ error: "No school. Seed school first." });

    const teachers = [
      {
        name: "Alice Banda",
        email: "alice.teacher@demo.school",
        password: "teacher123",
      },
      {
        name: "Brian Phiri",
        email: "brian.teacher@demo.school",
        password: "teacher123",
      },
    ];

    const created = [];

    for (const t of teachers) {
      let user = await prisma.user.findUnique({ where: { email: t.email } });
      if (!user) {
        const passwordHash = await bcrypt.hash(t.password, 10);
        user = await prisma.user.create({
          data: {
            schoolId: school.id,
            name: t.name,
            email: t.email,
            role: "teacher",
            passwordHash,
            isActive: true,
            mustChangePassword: true,
          },
        });
      }
      created.push({ ...user, tempPassword: t.password });
    }

    res.json({ ok: true, teachers: created });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
