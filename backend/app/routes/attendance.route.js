const router = require("express").Router();
const ctrl = require("../controllers/attendance.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const {
  requireRole,
  requireTeacherClassAccess,
} = require("../middlewares/rbac.middleware");

// Auth for all
router.use(authRequired);

// LIST (teachers and admins can view)
// classId in query – protect class scope for teachers
router.get(
  "/",
  requireRole("admin", "teacher"),
  requireTeacherClassAccess("classId"),
  ctrl.listForClass
);

// SUMMARY (view only)
router.get(
  "/summary",
  requireRole("admin", "teacher"),
  requireTeacherClassAccess("classId"),
  ctrl.summary
);

// WRITE (teachers only)
router.put(
  "/mark-all",
  requireRole("teacher"),
  requireTeacherClassAccess("classId"),
  ctrl.markAll
);
router.put(
  "/mark",
  requireRole("teacher"),
  requireTeacherClassAccess("classId"),
  ctrl.markOne
);
router.get(
  "/student-summary",
  requireRole("admin", "teacher", "bursar"),
  ctrl.studentSummary
);

module.exports = router;
