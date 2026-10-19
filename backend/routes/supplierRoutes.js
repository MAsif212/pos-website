const express = require("express");
const c = require("../controllers/supplierController");
const router = express.Router();

router.route("/").get(c.getSuppliers).post(c.createSupplier);
router.route("/:id").put(c.updateSupplier).delete(c.deleteSupplier);

module.exports = router;