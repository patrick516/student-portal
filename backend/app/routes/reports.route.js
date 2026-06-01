const router = require("express").Router();
const ctrl = require("../controllers/reports.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin", "bursar"));
router.get("/debtors", ctrl.debtors);
router.get("/fees", ctrl.feesReport);

module.exports = router;
