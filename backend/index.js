// backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// -------------------
// DEBUG: environment variables
// -------------------
console.log("ENV DATABASE_URL:", process.env.DATABASE_URL);
console.log("ENV PORT:", process.env.PORT);

const app = express();

// -------------------
// CORS configuration
// -------------------
const allowedOrigins = [
  "https://student-portal-ecru.vercel.app", // Vercel frontend
  "http://localhost:5173", // local dev
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile apps, curl, etc.
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `CORS error: Origin ${origin} not allowed`;
        console.warn(msg);
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // allow cookies/auth headers
  }),
);

// -------------------
// Body parser
// -------------------
app.use(express.json());

// -------------------
// Health check
// -------------------
app.get("/health", (_req, res) => res.json({ ok: true }));

// -------------------
// Attach routes
// -------------------
const authRoutes = require("./app/routes/auth.route");
const studentsRoutes = require("./app/routes/students.route");
const classesRoutes = require("./app/routes/classes.route");
const auditRoutes = require("./app/routes/audit.route");
const setupRoutes = require("./app/routes/setup.route");
const usersRoutes = require("./app/routes/users.route");
const subjectsRoutes = require("./app/routes/subjects.route");
const attendanceRoutes = require("./app/routes/attendance.route");
const feesRoutes = require("./app/routes/fees.route");
const reportsRoutes = require("./app/routes/reports.route");
const examsRoutes = require("./app/routes/exams.route");
const guardiansRoutes = require("./app/routes/guardians.route");
const termsRoutes = require("./app/routes/terms.route");
const feeSettingsRoutes = require("./app/routes/feeSettings.route");
const settingsRoutes = require("./app/routes/settings.route");
const feeComponentsRoutes = require("./app/routes/feeComponents.route");

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/exams", examsRoutes);
app.use("/api/guardians", guardiansRoutes);
app.use("/api/terms", termsRoutes);
app.use("/api/fee-settings", feeSettingsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/fee-components", feeComponentsRoutes);

// -------------------
// Error handler
// -------------------
app.use((err, _req, res, _next) => {
  console.error("Express error:", err.message);
  res.status(500).json({ error: err.message });
});

// -------------------
// Start server
// -------------------
const port = process.env.PORT || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`API running on port ${port}`);
  console.log(`Health check available at /health`);
});
