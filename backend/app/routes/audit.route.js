const router = require("express").Router();
const ctrl = require("../controllers/audit.controller");
const { authRequired } = require("../middlewares/auth.middleware");

// GET /api/audit?action=&resource=&userId=&limit=50
router.get("/", authRequired, ctrl.list);

module.exports = router;
