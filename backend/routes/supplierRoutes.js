const express = require("express");
const c = require("../controllers/supplierController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.use(protect, authorize("admin"));

router.route("/").get(c.getSuppliers).post(c.createSupplier);
router.route("/:id").put(c.updateSupplier).delete(c.deleteSupplier);

module.exports = router;