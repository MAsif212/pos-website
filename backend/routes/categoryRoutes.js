const express = require("express");
const c = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.use(protect);

router.route("/").get(c.getCategories).post(authorize("admin"), c.createCategory);
router
  .route("/:id")
  .put(authorize("admin"), c.updateCategory)
  .delete(authorize("admin"), c.deleteCategory);

module.exports = router;