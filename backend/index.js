// backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("ENV DATABASE_URL:", process.env.DATABASE_URL);

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

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://student-portal-ecru.vercel.app",
  "http://localhost:5173",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // allow cookies/auth headers
  }),
);

app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// real routes
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

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
