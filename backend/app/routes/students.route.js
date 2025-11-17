const router = require("express").Router();
const ctrl = require("../controllers/students.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.get("/", authRequired, ctrl.list);
router.post("/", authRequired, requireRole("admin", "teacher"), ctrl.create);

router.get("/:id", authRequired, ctrl.getOne);

module.exports = router;
