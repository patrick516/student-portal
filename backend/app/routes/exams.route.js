const router = require("express").Router();
const ctrl = require("../controllers/exams.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired);

router.get("/my-subjects", requireRole("teacher"), ctrl.mySubjects);

router.get(
  "/assessments",
  requireRole("admin", "teacher"),
  ctrl.listAssessments
);
router.post(
  "/assessments",
  requireRole("admin", "teacher"),
  ctrl.createAssessment
);

router.get("/marks", requireRole("admin", "teacher"), ctrl.listMarks);
router.put("/mark", requireRole("teacher"), ctrl.saveMark);

router.post(
  "/gradescheme",
  requireRole("admin", "teacher"),
  ctrl.setGradeScheme
);
router.get(
  "/results/class/:classId",
  requireRole("admin", "teacher"),
  ctrl.classResults
);

router.post(
  "/send-results-email",
  requireRole("admin", "teacher"),
  ctrl.sendResultsEmail
);

module.exports = router;
