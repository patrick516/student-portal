const router = require("express").Router();
const ctrl = require("../controllers/fees.controller");
const { authRequired } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authRequired, requireRole("admin", "bursar"));

router.get("/invoices", ctrl.listInvoices);
router.post("/invoices", ctrl.createInvoice);
router.get("/payments/:id/receipt", ctrl.getPaymentReceipt);

router.get("/payments", ctrl.listPayments);
router.post("/payments", ctrl.createPayment);
// backend/app/routes/fees.route.js
router.post(
  "/payments/:id/notify-guardians",
  requireRole("admin", "bursar"),
  ctrl.notifyGuardiansForPayment,
);
router.put(
  "/invoices/:id/override",
  requireRole("admin", "bursar"),
  ctrl.overrideInvoice,
);
router.get("/credits", requireRole("admin", "bursar"), ctrl.listCredits);
module.exports = router;
