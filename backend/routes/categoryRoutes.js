const express = require("express");
const c = require("../controllers/categoryController");
const router = express.Router();

router.route("/").get(c.getCategories).post(c.createCategory);
router.route("/:id").put(c.updateCategory).delete(c.deleteCategory);

module.exports = router;