// backend/app/routes/students.route.js
const router = require("express").Router();
const ctrl = require("../controllers/students.controller");
const { authRequired } = require("../middlewares/auth.middleware");

// Note: we do NOT use requireRole here, because create/suspend/dismiss
// have detailed role logic inside controller (admin vs form teacher vs bursar).
router.use(authRequired);

// List students (visibility restricted by role in controller)
router.get("/", ctrl.list);

// Create student (admin or form teacher only – enforced in controller)
router.post("/", ctrl.create);

// Get single student profile (with access checks for teachers)
router.get("/:id", ctrl.getOne);

// Suspend / dismiss / delete (actions visible in UI only to allowed roles)
router.post("/:id/suspend", ctrl.suspend);
router.post("/:id/dismiss", ctrl.dismiss);
router.delete("/:id", ctrl.remove);

module.exports = router;
