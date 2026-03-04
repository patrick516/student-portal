// backend/app/routes/classes.route.js
const router = require("express").Router();
const ctrl = require("../controllers/classes.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired);

router.get("/", ctrl.list);
router.get("/my-form", requireRole("admin", "teacher"), ctrl.myFormClasses);
router.get("/:id/summary", requireRole("admin"), ctrl.summary);

router.post("/", requireRole("admin"), ctrl.create);
router.put("/:id/form-teacher", requireRole("admin"), ctrl.setFormTeacher);

module.exports = router;
