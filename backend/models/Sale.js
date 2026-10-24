const crypto = require("crypto");
const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    // How much was really taken from stock (less than quantity if stock ran out offline)
    stockTaken: { type: Number },
  },
  { _id: false }
);

// Notes the server adds when an offline sale needs the admin's attention
const flagSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ["stock_shortage", "price_changed", "product_missing"],
      required: true,
    },
    productName: { type: String, default: "" },
    message: { type: String, default: "" },
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
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cashierName: { type: String, default: "" },

    // Offline support
    clientId: { type: String, unique: true, sparse: true }, // UUID made on the device
    wasOffline: { type: Boolean, default: false },
    syncedAt: { type: Date },
    flags: { type: [flagSchema], default: [] },

    // Admin review of flagged sales
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
  },
  { timestamps: true }
);

// Short random ending so two sales in the same millisecond never clash
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomSuffix = () =>
  Array.from({ length: 4 }, () => CHARS[crypto.randomInt(CHARS.length)]).join("");

saleSchema.pre("save", async function () {
  if (!this.invoiceNo) {
    this.invoiceNo = `INV-${Date.now()}-${randomSuffix()}`;
  }
});

module.exports = mongoose.model("Sale", saleSchema);