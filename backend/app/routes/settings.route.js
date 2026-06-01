// backend/app/routes/settings.route.js
const router = require("express").Router();
const ctrl = require("../controllers/settings.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin"));
router.get("/", ctrl.getSettings);
router.put("/", ctrl.updateSettings);

module.exports = router;
