const express = require("express");
const c = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.use(protect);

router.get("/low-stock", authorize("admin"), c.getLowStock);
router.get("/barcode/:barcode", c.getByBarcode);
router.route("/").get(c.getProducts).post(authorize("admin"), c.createProduct);
router
  .route("/:id")
  .get(c.getProduct)
  .put(authorize("admin"), c.updateProduct)
  .delete(authorize("admin"), c.deleteProduct);

module.exports = router;