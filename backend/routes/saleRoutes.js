const express = require("express");
const c = require("../controllers/saleController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.use(protect);

router.route("/").get(c.getSales).post(c.createSale);
router.get("/:id", c.getSale);
router.put("/:id/refund", authorize("admin"), c.refundSale);
router.put("/:id/review", authorize("admin"), c.reviewSale);

module.exports = router;