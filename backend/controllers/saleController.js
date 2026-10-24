const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

const money = (n) => Math.round(n * 100) / 100;
const isCashier = (req) => req.user.role === "cashier";

const UUID_RULE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFLINE_INVOICE_RULE = /^INV-\d{13}-[A-Z0-9]{4}$/;
const MAX_OFFLINE_AGE_DAYS = 30;

// Stop the request with a clear message
const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// Combine repeated products in a cart into one line
function mergeItems(res, items) {
  if (!Array.isArray(items) || items.length === 0) fail(res, 400, "Cart is empty");

  const merged = new Map();
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.product || !qty || qty <= 0) {
      fail(res, 400, "Each item needs a product and a quantity above 0");
    }
    const key = String(item.product);
    const existing = merged.get(key);
    if (existing) existing.quantity += qty;
    else merged.set(key, { ...item, product: key, quantity: qty });
  }
  return [...merged.values()];
}

// Subtotal, discount, GST, total, change: always calculated on the server
function calcTotals(res, lines, { discount, taxRate, paymentMethod, amountPaid }) {
  const subtotal = money(lines.reduce((sum, l) => sum + l.total, 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = money(((subtotal - safeDiscount) * (Number(taxRate) || 0)) / 100);
  const total = money(subtotal - safeDiscount + tax);

  let paid = Number(amountPaid) || 0;
  if (paymentMethod === "card") paid = total;
  if (paid < total) fail(res, 400, `Amount paid is less than the total (Rs ${total})`);

  return {
    subtotal,
    discount: safeDiscount,
    tax,
    total,
    amountPaid: paid,
    change: money(paid - total),
  };
}

// ---------- Normal sale (device is online) ----------
async function saveOnlineSale(req, res, body) {
  const merged = mergeItems(res, body.items);

  // Check products and stock, using today's prices
  const lines = [];
  for (const item of merged) {
    const product = await Product.findById(item.product).catch(() => null);
    if (!product) fail(res, 404, "A product in the cart no longer exists");
    if (product.stock < item.quantity) {
      fail(res, 400, `Only ${product.stock} ${product.unit} of ${product.name} left in stock`);
    }
    lines.push({
      product: product._id,
      name: product.name,
      price: product.salePrice,
      quantity: item.quantity,
      total: money(product.salePrice * item.quantity),
      stockTaken: item.quantity,
    });
  }

  const totals = calcTotals(res, lines, body);

  // Save the sale first: this claims the clientId, so a duplicate can't slip in
  const sale = await Sale.create({
    items: lines,
    ...totals,
    paymentMethod: body.paymentMethod || "cash",
    customerName: body.customerName || undefined,
    cashier: req.user._id,
    cashierName: req.user.name,
    clientId: body.clientId || undefined,
  });

  // Reduce stock; if an item ran out in the meantime, undo everything
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
      await Sale.deleteOne({ _id: sale._id });
      fail(res, 400, `${line.name} just went out of stock. Try again.`);
    }
    done.push(line);
  }

  return sale;
}

// ---------- Sale made while offline, now being synced ----------
async function saveOfflineSale(req, res, body) {
  const offline = body.offline || {};

  if (!body.clientId) fail(res, 400, "Offline sales need a sale ID");
  if (!OFFLINE_INVOICE_RULE.test(String(offline.invoiceNo || ""))) {
    fail(res, 400, "Invalid offline invoice number");
  }

  // The real time the sale happened
  const soldAt = new Date(offline.soldAt);
  const now = Date.now();
  if (Number.isNaN(soldAt.getTime())) fail(res, 400, "Invalid sale time");
  if (soldAt.getTime() > now + 5 * 60 * 1000) fail(res, 400, "Sale time is in the future");
  if (now - soldAt.getTime() > MAX_OFFLINE_AGE_DAYS * 24 * 60 * 60 * 1000) {
    fail(res, 400, `Offline sales older than ${MAX_OFFLINE_AGE_DAYS} days can't be synced`);
  }

  // The cashier who made the sale, even if someone else is logged in now
  let cashier = req.user;
  if (offline.cashierId && String(offline.cashierId) !== String(req.user._id)) {
    const original = await User.findById(offline.cashierId).catch(() => null);
    if (original) cashier = original;
  }

  const merged = mergeItems(res, body.items);
  const lines = [];
  const flags = [];
  const stockChanges = []; // { index, product, quantity, unit, name }

  for (const item of merged) {
    if (!mongoose.isValidObjectId(item.product)) fail(res, 400, "Invalid product in the sale");

    // Keep the price the customer actually paid
    const price = Number(item.price);
    if (!(price >= 0)) fail(res, 400, "Each offline item needs its price");

    const product = await Product.findById(item.product).catch(() => null);
    const name = product ? product.name : String(item.name || "Unknown product");

    if (!product) {
      flags.push({
        code: "product_missing",
        productName: name,
        message: "Product no longer exists; stock not changed",
      });
    } else {
      if (product.salePrice !== price) {
        flags.push({
          code: "price_changed",
          productName: name,
          message: `Sold at Rs ${price}, current price is Rs ${product.salePrice}`,
        });
      }
      stockChanges.push({
        index: lines.length,
        product: product._id,
        quantity: item.quantity,
        unit: product.unit,
        name,
      });
    }

    lines.push({
      product: product ? product._id : item.product,
      name,
      price,
      quantity: item.quantity,
      total: money(price * item.quantity),
      stockTaken: 0,
    });
  }

  const totals = calcTotals(res, lines, body);

  // Save first with the device's invoice number and real sale time (claims the clientId)
  const sale = new Sale({
    clientId: body.clientId,
    invoiceNo: offline.invoiceNo,
    items: lines,
    ...totals,
    paymentMethod: body.paymentMethod || "cash",
    customerName: body.customerName || undefined,
    cashier: cashier._id,
    cashierName: cashier.name,
    wasOffline: true,
    syncedAt: new Date(),
    flags,
    createdAt: soldAt,
    updatedAt: new Date(),
  });
  await sale.save({ timestamps: false });

  // Reduce stock (never below 0) and note how much was really taken
  const updates = {};
  const shortageFlags = [];
  for (const change of stockChanges) {
    const result = await Product.collection.findOneAndUpdate(
      { _id: change.product },
      [{ $set: { stock: { $max: [0, { $subtract: ["$stock", change.quantity] }] } } }],
      { returnDocument: "before" }
    );
    // Works with both driver result styles
    const before = result && result.value !== undefined ? result.value : result;
    const taken = Math.min(change.quantity, Math.max(0, before?.stock ?? 0));

    updates[`items.${change.index}.stockTaken`] = taken;
    if (taken < change.quantity) {
      shortageFlags.push({
        code: "stock_shortage",
        productName: change.name,
        message: `Short by ${change.quantity - taken} ${change.unit}; stock set to 0`,
      });
    }
  }

  if (stockChanges.length > 0) {
    const update = { $set: updates };
    if (shortageFlags.length) update.$push = { flags: { $each: shortageFlags } };
    await Sale.updateOne({ _id: sale._id }, update, { timestamps: false });
  }

  return Sale.findById(sale._id);
}

exports.createSale = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { clientId } = body;

  if (clientId !== undefined && !UUID_RULE.test(String(clientId))) {
    fail(res, 400, "Invalid sale ID");
  }

  // Already saved? Then this is a retry: return the same sale, don't save it twice
  if (clientId) {
    const existing = await Sale.findOne({ clientId });
    if (existing) return res.status(200).json(existing);
  }

  try {
    const sale = body.offline
      ? await saveOfflineSale(req, res, body)
      : await saveOnlineSale(req, res, body);
    res.status(201).json(sale);
  } catch (err) {
    // Two copies arrived at the same moment: the other one won, return it
    if (err.code === 11000 && err.keyPattern?.clientId) {
      const existing = await Sale.findOne({ clientId });
      if (existing) return res.status(200).json(existing);
    }
    throw err;
  }
});

exports.getSales = asyncHandler(async (req, res) => {
  const { from, to, search, status, view } = req.query;
  const filter = {};

  // Cashiers only see their own sales
  if (isCashier(req)) filter.cashier = req.user._id;

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

  // Admin shortcuts
  if (view === "review") {
    filter["flags.0"] = { $exists: true };
    filter.reviewedAt = null;
  }
  if (view === "offline") filter.wasOffline = true;

  const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(sales);
});

exports.getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).catch(() => null);
  const notTheirs = sale && isCashier(req) && String(sale.cashier) !== String(req.user._id);
  if (!sale || notTheirs) {
    res.status(404);
    throw new Error("Sale not found");
  }
  res.json(sale);
});

exports.refundSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).catch(() => null);
  if (!sale) {
    res.status(404);
    throw new Error("Sale not found");
  }
  if (sale.status === "refunded") {
    res.status(400);
    throw new Error("This sale is already refunded");
  }

  // Put back only what was really taken from stock
  for (const item of sale.items) {
    const giveBack = item.stockTaken ?? item.quantity;
    if (giveBack > 0) {
      await Product.updateOne({ _id: item.product }, { $inc: { stock: giveBack } });
    }
  }

  sale.status = "refunded";
  await sale.save();
  res.json(sale);
});

exports.reviewSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).catch(() => null);
  if (!sale) {
    res.status(404);
    throw new Error("Sale not found");
  }

  sale.reviewedAt = new Date();
  sale.reviewedBy = req.user.name;
  await sale.save();
  res.json(sale);
});