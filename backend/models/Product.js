const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    barcode: { type: String, required: true, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    costPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, enum: ["piece", "kg", "liter", "pack"], default: "piece" },
    lowStockLimit: { type: Number, default: 10 },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);