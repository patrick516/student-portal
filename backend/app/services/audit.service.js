const { prisma } = require("../config/prisma");

async function logAudit({
  schoolId,
  userId,
  action,
  resource,
  targetId,
  meta,
  ip,
  userAgent,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: userId || null,
        action,
        resource,
        targetId: targetId || null,
        meta: meta || undefined,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });
  } catch (e) {
    // Fails silently to avoid breaking normal flow
    console.error("Audit log error:", e.message);
  }
}

module.exports = { logAudit };
