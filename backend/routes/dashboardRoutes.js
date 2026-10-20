const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.get("/", protect, authorize("admin"), getDashboard);

module.exports = router;