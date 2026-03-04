const router = require("express").Router();
const ctrl = require("../controllers/subjects.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin"));
router.get("/", ctrl.list);
router.post("/", ctrl.create);

module.exports = router;
