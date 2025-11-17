const router = require("express").Router();
const ctrl = require("../controllers/setup.controller");

// Public on purpose (bootstrap only). Remove or protect later if needed.
router.post("/seed-school", ctrl.seedSchool);
router.post("/seed-classes", ctrl.seedClasses);
router.post("/seed-students", ctrl.seedStudents);
router.post("/seed-teachers", ctrl.seedTeachers);

module.exports = router;
