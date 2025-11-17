// backend/app/routes/users.route.js
const router = require("express").Router()
const ctrl = require("../controllers/users.controller")
const { authRequired } = require("../middlewares/auth.middleware")
const { requireRole } = require("../middlewares/rbac.middleware")

router.use(authRequired, requireRole("admin"))

// list, create etc...
router.get("/", ctrl.listUsers)
router.post("/", ctrl.createUser)

// this is the one we just upgraded:
router.put("/:id", ctrl.updateUser)

// resend invite, class/assignments etc...
router.post("/:id/resend-invite", ctrl.resendInvite)
// ...
module.exports = router
