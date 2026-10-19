const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};

  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { barcode: { $regex: safe, $options: "i" } },
    ];
  }
  if (category) filter.category = category;

  const products = await Product.find(filter)
    .populate("category", "name")
    .populate("supplier", "name")
    .sort({ createdAt: -1 });

  res.json(products);
});

exports.getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    $expr: { $lte: ["$stock", "$lowStockLimit"] },
  })
    .populate("category", "name")
    .sort({ stock: 1 });
  res.json(products);
});

exports.getByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.barcode }).populate(
    "category",
    "name"
  );
  if (!product) {
    res.status(404);
    throw new Error("No product with this barcode");
  }
  res.json(product);
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name")
    .populate("supplier", "name");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ message: "Product deleted" });
});