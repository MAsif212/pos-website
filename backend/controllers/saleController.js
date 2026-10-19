const Sale = require("../models/Sale");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");

const money = (n) => Math.round(n * 100) / 100;

exports.createSale = asyncHandler(async (req, res) => {
  const {
    items,
    discount = 0,
    taxRate = 0,
    paymentMethod = "cash",
    amountPaid = 0,
    customerName,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  // Merge duplicate products in the cart
  const merged = {};
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.product || !qty || qty <= 0) {
      res.status(400);
      throw new Error("Each item needs a product and a quantity above 0");
    }
    merged[item.product] = (merged[item.product] || 0) + qty;
  }

  // Check products and stock, build sale lines
  const lines = [];
  for (const [productId, quantity] of Object.entries(merged)) {
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("A product in the cart no longer exists");
    }
    if (product.stock < quantity) {
      res.status(400);
      throw new Error(`Only ${product.stock} ${product.unit} of ${product.name} left in stock`);
    }
    lines.push({
      product: product._id,
      name: product.name,
      price: product.salePrice,
      quantity,
      total: money(product.salePrice * quantity),
    });
  }

  // Calculate totals
  const subtotal = money(lines.reduce((sum, l) => sum + l.total, 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = money(((subtotal - safeDiscount) * (Number(taxRate) || 0)) / 100);
  const total = money(subtotal - safeDiscount + tax);

  let paid = Number(amountPaid) || 0;
  if (paymentMethod === "card") paid = total;
  if (paid < total) {
    res.status(400);
    throw new Error(`Amount paid is less than the total (Rs ${total})`);
  }
  const change = money(paid - total);

  // Reduce stock safely; undo if anything fails
  const done = [];
  for (const line of lines) {
    const result = await Product.updateOne(
      { _id: line.product, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (result.modifiedCount === 0) {
      for (const d of done) {
        await Product.updateOne({ _id: d.product }, { $inc: { stock: d.quantity } });
      }
      res.status(400);
      throw new Error(`${line.name} just went out of stock. Try again.`);
    }
    done.push(line);
  }

  const sale = await Sale.create({
    items: lines,
    subtotal,
    discount: safeDiscount,
    tax,
    total,
    paymentMethod,
    amountPaid: paid,
    change,
    customerName: customerName || undefined,
  });

  res.status(201).json(sale);
});

exports.getSales = asyncHandler(async (req, res) => {
  const { from, to, search, status } = req.query;
  const filter = {};

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  if (search) filter.invoiceNo = { $regex: search.replace(/[^\w-]/g, ""), $options: "i" };
  if (status) filter.status = status;

  const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(sales);
});

exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    res.status(404);
    throw new Error("Sale not found");
  }
  res.json(sale);
});

exports.refundSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    res.status(404);
    throw new Error("Sale not found");
  }
  if (sale.status === "refunded") {
    res.status(400);
    throw new Error("This sale is already refunded");
  }

  for (const item of sale.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }

  sale.status = "refunded";
  await sale.save();
  res.json(sale);
});