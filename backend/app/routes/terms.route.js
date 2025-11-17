// backend/app/routes/terms.route.js
const express = require("express");
const router = express.Router();

const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/terms.controller"); // make sure this file exists

// Admin-only routes for managing terms
router.use(authRequired, requireRole("admin"));

// GET /api/terms
router.get("/", ctrl.list);

// POST /api/terms
router.post("/", ctrl.create);

// (if you implemented more like /:id etc, add them here, e.g.)
// router.put('/:id', ctrl.update)
// router.delete('/:id', ctrl.remove)

module.exports = router;
