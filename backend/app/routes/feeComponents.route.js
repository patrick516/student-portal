// backend/app/routes/feeComponents.route.js
const router = require("express").Router();
const ctrl = require("../controllers/feeComponents.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin", "bursar"));

router.get("/", ctrl.list);
router.get("/calculate", ctrl.calculate);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
