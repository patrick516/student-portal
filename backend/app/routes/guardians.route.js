// backend/app/routes/guardians.route.js
const router = require("express").Router();
const ctrl = require("../controllers/guardians.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

// allow admin and teachers (form teachers) to manage guardians
router.use(authRequired, requireRole("admin", "teacher"));

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
