const express = require("express");
const c = require("../controllers/saleController");
const router = express.Router();

router.route("/").get(c.getSales).post(c.createSale);
router.get("/:id", c.getSale);
router.put("/:id/refund", c.refundSale);

module.exports = router;