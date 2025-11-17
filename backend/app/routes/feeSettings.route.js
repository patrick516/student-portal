// backend/app/routes/feeSettings.route.js
const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/feeSettings.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

// Headteacher + Bursar can manage fee settings
router.use(authRequired, requireRole("admin", "bursar"));

router.get("/", ctrl.list);
router.post("/", ctrl.upsert);

module.exports = router;
