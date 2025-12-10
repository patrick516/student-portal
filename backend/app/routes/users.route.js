// backend/app/routes/users.route.js
const router = require("express").Router();
const ctrl = require("../controllers/users.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin"));

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);

router.post("/:id/resend-invite", ctrl.resendInvite);
// ...

router.get("/:id/classes", ctrl.getClasses);
router.put("/:id/classes", ctrl.setClasses);

// Teacher subject × class assignments
router.get("/:id/assignments", ctrl.getAssignments);
router.put("/:id/assignments", ctrl.setAssignments);

module.exports = router;
