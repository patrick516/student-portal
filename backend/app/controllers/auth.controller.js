// backend/app/controllers/auth.controller.js
const bcrypt = require("bcrypt");
const { prisma } = require("../config/prisma");
const { signJwt } = require("../config/jwt");
const { logAudit } = require("../services/audit.service");

const SECRET = process.env.JWT_SECRET || "dev_secret";

// ---------------------------------------------
// GET /api/auth/can-register-first
// ---------------------------------------------
exports.canRegisterFirst = async (req, res) => {
  try {
    console.log("canRegisterFirst: handler invoked"); // DEBUG
    const count = await prisma.user.count();
    console.log("canRegisterFirst: user count =", count); // DEBUG
    return res.json({ allowed: count === 0 });
  } catch (e) {
    console.error("canRegisterFirst error:", e);
    return res.status(500).json({ error: e.message });
  }
};

// ---------------------------------------------
// POST /api/auth/register-headteacher
// body: { firstName, lastName, email, phone?, password }
// Only allowed when there are zero users
// ---------------------------------------------
exports.registerHeadteacher = async (req, res) => {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return res
        .status(400)
        .json({ error: "Headteacher is already registered" });
    }

    const { firstName, lastName, email, phone, password } = req.body || {};
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "firstName, lastName, email, password are required",
      });
    }

    // Ensure school exists (or create one)
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({ data: { name: "Demo School" } }); // rename later
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const name = `${firstName} ${lastName}`.trim();
    const passwordHash = await bcrypt.hash(password, 10);

    const head = await prisma.user.create({
      data: {
        schoolId: school.id,
        name,
        email,
        phone: phone || null,
        role: "admin", // Headteacher is admin
        passwordHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    await logAudit({
      schoolId: school.id,
      userId: head.id,
      action: "auth.register-headteacher",
      resource: "auth",
      targetId: head.id,
    });

    const token = signJwt({
      sub: head.id,
      role: head.role,
      schoolId: head.schoolId,
    });

    return res.status(201).json({
      token,
      user: {
        id: head.id,
        name: head.name,
        email: head.email,
        role: head.role,
        mustChangePassword: head.mustChangePassword,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ---------------------------------------------
// POST /api/auth/login
// body: { email, password }
// ---------------------------------------------
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signJwt({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
    });

    await logAudit({
      schoolId: user.schoolId,
      userId: user.id,
      action: "auth.login",
      resource: "auth",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ---------------------------------------------
// GET /api/auth/me
// ---------------------------------------------
exports.me = async (req, res) => {
  const u = req.user;
  return res.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      mustChangePassword: u.mustChangePassword,
    },
  });
};

// ---------------------------------------------
// POST /api/auth/change-password
// body: { currentPassword, newPassword }
// ---------------------------------------------
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "currentPassword and newPassword required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await logAudit({
      schoolId: user.schoolId,
      userId,
      action: "auth.change-password",
      resource: "auth",
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ---------------------------------------------
// POST /api/auth/seed-admin (dev helper; optional)
// ---------------------------------------------
exports.seedAdmin = async (_req, res) => {
  try {
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({ data: { name: "Demo School" } });
    }

    const existing = await prisma.user.findUnique({
      where: { email: "admin@demo.school" },
    });

    if (existing) {
      if (existing.mustChangePassword) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { mustChangePassword: false },
        });
      }
      return res.json({
        ok: true,
        userId: existing.id,
        email: existing.email,
        password: "admin123 (existing)",
      });
    }

    const passwordHash = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: "admin@demo.school",
        name: "Head Teacher",
        role: "admin",
        passwordHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    await logAudit({
      schoolId: school.id,
      userId: admin.id,
      action: "auth.seed-admin",
      resource: "auth",
      targetId: admin.id,
    });

    return res.json({
      ok: true,
      userId: admin.id,
      email: admin.email,
      password: "admin123",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
