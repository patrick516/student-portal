// backend/app/routes/auth.route.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/auth.controller");
const { authRequired } = require("../middlewares/auth.middleware");

// public
const settingsCtrl = require("../controllers/settings.controller");
router.get("/can-register-first", ctrl.canRegisterFirst);
router.post("/register-headteacher", ctrl.registerHeadteacher);
router.post("/login", ctrl.login);
router.get("/school-info", settingsCtrl.publicSchoolInfo);

// protected
router.get("/me", authRequired, ctrl.me);
router.post("/change-password", authRequired, ctrl.changePassword);

// dev helper
router.post("/seed-admin", ctrl.seedAdmin);

module.exports = router;
