const bcrypt = require("bcryptjs");
const { prisma } = require("../config/prisma");
const { logAudit } = require("../services/audit.service");
const {
  sendTeacherInvite,
  invitePayload,
} = require("../services/mail.service");

// GET /api/users?role=teacher
exports.list = async (req, res) => {
  try {
    const role = (req.query.role || "").trim();
    const users = await prisma.user.findMany({
      where: {
        schoolId: req.user.schoolId,
        ...(role ? { role } : {}),
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json({ data: users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, staffCode, phone, employmentStart } =
      req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });

    const roleSafe = ["admin", "teacher", "bursar", "viewer"].includes(role)
      ? role
      : "teacher";

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        schoolId: req.user.schoolId,
        name,
        email,
        role: roleSafe,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        staffCode: staffCode || null,
        phone: phone || null,
        employmentStart: employmentStart ? new Date(employmentStart) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        staffCode: true,
        phone: true,
      },
    });

    // send invite email using new template helper
    try {
      await sendTeacherInvite(invitePayload(user.email, password));
    } catch (e) {
      console.error("Email invite failed:", e.message);
    }

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "user.create",
      resource: "user",
      targetId: user.id,
      meta: { email: user.email, role: user.role },
    });
    res.status(201).json({ ...user, tempPassword: password });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/users/:id { name?, email?, role?, isActive? }
// PUT /api/users/:id { name?, email?, role?, isActive? }
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body || {};
    const currentUser = req.user; // logged-in headteacher/admin

    const allowedRoles = ["admin", "teacher", "bursar", "viewer"];

    // 1) Load target user
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2) Build dataToUpdate only with provided fields
    const dataToUpdate = {};

    // name
    if (typeof name === "string" && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    // email
    if (typeof email === "string" && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();

      // basic format validation
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // uniqueness check (except for target itself)
      const existing = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });
      if (existing && existing.id !== target.id) {
        return res.status(409).json({ error: "Email already in use" });
      }

      dataToUpdate.email = trimmedEmail;
    }

    // role
    let newRole = target.role;
    if (role && allowedRoles.includes(role)) {
      newRole = role;
      dataToUpdate.role = role;
    }

    // isActive
    if (typeof isActive === "boolean") {
      dataToUpdate.isActive = isActive;
    }

    // 3) Safety: protect Head Teacher / admin accounts
    const isTargetAdmin = target.role === "admin";
    const isChangingRole =
      dataToUpdate.role && dataToUpdate.role !== target.role;
    const isChangingActive =
      Object.prototype.hasOwnProperty.call(dataToUpdate, "isActive") &&
      dataToUpdate.isActive !== target.isActive;

    const countActiveAdmins = async () => {
      return prisma.user.count({
        where: {
          schoolId: target.schoolId,
          role: "admin",
          isActive: true,
        },
      });
    };

    // 3a) Prevent demoting the last admin to non-admin
    if (isTargetAdmin && isChangingRole && dataToUpdate.role !== "admin") {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({
          error: "Cannot change role of the last Head Teacher (admin).",
        });
      }
    }

    // 3b) Prevent deactivating the last active admin
    if (isTargetAdmin && isChangingActive && dataToUpdate.isActive === false) {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({
          error: "Cannot deactivate the last Head Teacher (admin).",
        });
      }
    }

    // 3c) Prevent current admin from removing their own admin role
    if (
      currentUser &&
      currentUser.id === target.id &&
      isChangingRole &&
      dataToUpdate.role !== "admin"
    ) {
      return res.status(400).json({
        error: "You cannot remove your own Head Teacher (admin) role.",
      });
    }

    // 4) Apply update
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    // 5) Audit log with changed fields (safe)
    try {
      const changedFields = [];
      if (dataToUpdate.name && dataToUpdate.name !== target.name) {
        changedFields.push("name");
      }
      if (dataToUpdate.email && dataToUpdate.email !== target.email) {
        changedFields.push("email");
      }
      if (dataToUpdate.role && dataToUpdate.role !== target.role) {
        changedFields.push("role");
      }
      if (
        Object.prototype.hasOwnProperty.call(dataToUpdate, "isActive") &&
        dataToUpdate.isActive !== target.isActive
      ) {
        changedFields.push("isActive");
      }

      await logAudit({
        schoolId: updated.schoolId,
        userId: currentUser?.id,
        action: "user.update",
        resource: "user",
        targetId: updated.id,
        meta: {
          changedFields,
          fromRole: target.role,
          toRole: updated.role,
          fromActive: target.isActive,
          toActive: updated.isActive,
        },
      });
    } catch (auditErr) {
      console.error(
        "Audit log error (user.update):",
        auditErr?.message || auditErr
      );
    }

    return res.json(updated);
  } catch (e) {
    console.error("users.update error:", e);
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/users/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "user.delete",
      resource: "user",
      targetId: id,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/users/:id/classes  (teacher’s assigned classes)
exports.getClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const links = await prisma.teacherClass.findMany({
      where: { teacherId: id },
      select: {
        classId: true,
        klass: { select: { id: true, name: true, stream: true, year: true } },
      },
    });
    res.json({ data: links.map((l) => l.klass) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/users/:id/classes { classIds: string[] }
exports.setClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const { classIds } = req.body || {};
    if (!Array.isArray(classIds))
      return res.status(400).json({ error: "classIds must be an array" });

    // ensure teacher exists in same school
    const teacher = await prisma.user.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });
    if (!teacher) return res.status(404).json({ error: "User not found" });
    if (teacher.role !== "teacher")
      return res.status(400).json({ error: "User is not a teacher" });

    // reset links then create new
    await prisma.teacherClass.deleteMany({ where: { teacherId: id } });
    if (classIds.length) {
      await prisma.teacherClass.createMany({
        data: classIds.map((c) => ({ teacherId: id, classId: c })),
      });
    }

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "teacher.assign-classes",
      resource: "teacher",
      targetId: id,
      meta: { classIds },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/users/:id/assignments
exports.getAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const asg = await prisma.teacherAssignment.findMany({
      where: { teacherId: id },
      select: {
        id: true,
        subject: { select: { id: true, name: true } },
        klass: { select: { id: true, name: true, stream: true, year: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    res.json({ data: asg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/users/:id/assignments  { items: [{ classId, subjectId }] }
exports.setAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body || {};
    if (!Array.isArray(items))
      return res.status(400).json({ error: "items must be an array" });

    // ensure target user is teacher in same school
    const teacher = await prisma.user.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });
    if (!teacher) return res.status(404).json({ error: "User not found" });
    if (teacher.role !== "teacher")
      return res.status(400).json({ error: "User is not a teacher" });

    await prisma.teacherAssignment.deleteMany({ where: { teacherId: id } });
    if (items.length) {
      await prisma.teacherAssignment.createMany({
        data: items.map((it) => ({
          teacherId: id,
          classId: it.classId,
          subjectId: it.subjectId,
        })),
      });
    }
    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "teacher.set-assignments",
      resource: "teacher",
      targetId: id,
      meta: { count: items.length },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
// POST /api/users/:id/resend-invite
// Generates a fresh temp password, emails it, returns temp once
exports.resendInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { id, schoolId: req.user.schoolId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const temp = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(temp, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true, isActive: true },
    });

    // send invite email using new template helper
    try {
      await sendTeacherInvite(invitePayload(user.email, temp));
    } catch (e) {
      console.error("Resend invite mail failed:", e.message);
    }

    await logAudit({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "user.resend-invite",
      resource: "user",
      targetId: user.id,
    });
    res.json({ ok: true, tempPassword: temp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
