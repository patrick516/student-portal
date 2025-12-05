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
module.exports = router;
