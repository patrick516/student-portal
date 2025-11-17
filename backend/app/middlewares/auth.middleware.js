// backend/app/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/prisma");

const SECRET = process.env.JWT_SECRET || "dev_secret";

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid user" });
    }
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authRequired };
