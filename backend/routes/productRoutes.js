const express = require("express");
const c = require("../controllers/productController");
const router = express.Router();

router.get("/low-stock", c.getLowStock);
router.get("/barcode/:barcode", c.getByBarcode);
router.route("/").get(c.getProducts).post(c.createProduct);
router.route("/:id").get(c.getProduct).put(c.updateProduct).delete(c.deleteProduct);

module.exports = router;