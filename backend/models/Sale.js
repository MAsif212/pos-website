const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true },
    items: { type: [saleItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card"], default: "cash" },
    amountPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    customerName: { type: String, default: "Walk-in customer" },
    status: { type: String, enum: ["completed", "refunded"], default: "completed" },
  },
  { timestamps: true }
);

saleSchema.pre("save", async function () {
  if (!this.invoiceNo) {
    this.invoiceNo = "INV-" + Date.now();
  }
});

module.exports = mongoose.model("Sale", saleSchema);