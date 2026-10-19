const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const asyncHandler = require("../middleware/asyncHandler");

exports.getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json(suppliers);
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json(supplier);
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }
  res.json(supplier);
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  const used = await Product.countDocuments({ supplier: req.params.id });
  if (used > 0) {
    res.status(400);
    throw new Error(`Can't delete: ${used} product(s) use this supplier`);
  }
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }
  res.json({ message: "Supplier deleted" });
});