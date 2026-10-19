const Sale = require("../models/Sale");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");

const TZ = "Asia/Karachi";

exports.getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.toLocaleDateString("en-CA", { timeZone: TZ }) + "T00:00:00+05:00");
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const completed = { status: "completed" };

  const [todayStats, totalProducts, lowStockCount, last7, topProducts, recentSales] =
    await Promise.all([
      Sale.aggregate([
        { $match: { ...completed, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Product.countDocuments(),
      Product.countDocuments({ $expr: { $lte: ["$stock", "$lowStockLimit"] } }),
      Sale.aggregate([
        { $match: { ...completed, createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            revenue: { $sum: "$total" },
          },
        },
      ]),
      Sale.aggregate([
        { $match: completed },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      Sale.find().sort({ createdAt: -1 }).limit(5),
    ]);

  // Fill in days with no sales so the chart always has 7 bars
  const salesByDay = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toLocaleDateString("en-CA", { timeZone: TZ });
    const found = last7.find((x) => x._id === key);
    salesByDay.push({ date: key, revenue: found ? found.revenue : 0 });
  }

  res.json({
    todayRevenue: todayStats[0]?.revenue || 0,
    todaySales: todayStats[0]?.count || 0,
    totalProducts,
    lowStockCount,
    salesByDay,
    topProducts,
    recentSales,
  });
});