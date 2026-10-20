const express = require("express");
const c = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.use(protect, authorize("admin"));

router.route("/").get(c.getUsers).post(c.createUser);
router.put("/:id", c.updateUser);

module.exports = router;