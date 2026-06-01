const express = require("express");
const router = express.Router();
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/terms.controller");

router.use(authRequired, requireRole("admin"));
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.post("/:id/activate", ctrl.activate);
router.get("/:id/preview-activation", ctrl.previewActivation);

module.exports = router;
