require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("./models/Category");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");
const Sale = require("./models/Sale");

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const money = (n) => Math.round(n * 100) / 100;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const categories = [
  { name: "Dairy", description: "Milk, yogurt, cheese, butter" },
  { name: "Beverages", description: "Soft drinks, juices, water" },
  { name: "Snacks", description: "Chips, biscuits, chocolates" },
  { name: "Bakery", description: "Bread, buns, rusk" },
  { name: "Fruits and Vegetables", description: "Fresh fruits and vegetables" },
  { name: "Household", description: "Detergent, dishwash, cleaners" },
  { name: "Personal Care", description: "Soap, shampoo, toothpaste" },
  { name: "Grocery", description: "Rice, oil, spices" },
];

const suppliers = [
  { name: "Nestle Pakistan", phone: "0300-1234567", email: "orders@nestle.pk", address: "Lahore" },
  { name: "Engro Foods", phone: "0321-5550101", email: "sales@engrofoods.pk", address: "Karachi" },
  { name: "Coca-Cola Pakistan", phone: "0333-5550202", email: "trade@coca-cola.pk", address: "Lahore" },
  { name: "PepsiCo Pakistan", phone: "0345-5550303", email: "orders@pepsico.pk", address: "Lahore" },
  { name: "Unilever Pakistan", phone: "0300-5550404", email: "supply@unilever.pk", address: "Karachi" },
  { name: "Colgate-Palmolive Pakistan", phone: "0312-5550505", email: "orders@colgate.pk", address: "Lahore" },
  { name: "Dawn Foods", phone: "0301-5550606", email: "orders@dawnfoods.pk", address: "Lahore" },
  { name: "Shan Foods", phone: "0322-5550707", email: "trade@shanfoods.pk", address: "Karachi" },
  { name: "Local Fresh Market", phone: "0300-5550808", email: "", address: "Sialkot Sabzi Mandi" },
];

// [name, barcode, category, supplier, cost, sale, stock, unit, lowStockLimit, expiry in days or null]
const products = [
  ["Olpers Milk 1L", "8961000000011", "Dairy", "Engro Foods", 260, 300, 45, "liter", 10, 5],
  ["Nestle Yogurt 400g", "8961000000028", "Dairy", "Nestle Pakistan", 150, 180, 20, "piece", 8, 3],
  ["Cheddar Cheese 200g", "8961000000035", "Dairy", "Nestle Pakistan", 550, 650, 12, "piece", 5, 40],
  ["Butter 100g", "8961000000042", "Dairy", "Nestle Pakistan", 230, 270, 4, "piece", 6, 30],
  ["Coca-Cola 1.5L", "8961000000059", "Beverages", "Coca-Cola Pakistan", 180, 210, 40, "piece", 10, 180],
  ["Sprite 1.5L", "8961000000066", "Beverages", "Coca-Cola Pakistan", 180, 210, 30, "piece", 10, 180],
  ["Pepsi 1.5L", "8961000000073", "Beverages", "PepsiCo Pakistan", 175, 205, 25, "piece", 10, 180],
  ["Nestle Pure Life 1.5L", "8961000000080", "Beverages", "Nestle Pakistan", 70, 90, 60, "piece", 15, 365],
  ["Nestle Fruita Vitals Apple 1L", "8961000000097", "Beverages", "Nestle Pakistan", 250, 300, 18, "piece", 6, 45],
  ["Lays Masala 70g", "8961000000103", "Snacks", "PepsiCo Pakistan", 85, 100, 35, "pack", 10, 90],
  ["Kurkure Chutney Chaska 60g", "8961000000110", "Snacks", "PepsiCo Pakistan", 45, 60, 50, "pack", 10, 90],
  ["Dairy Milk Chocolate", "8961000000127", "Snacks", "Local Fresh Market", 220, 260, 5, "piece", 8, 120],
  ["Sooper Biscuits Family Pack", "8961000000134", "Snacks", "Local Fresh Market", 50, 60, 0, "pack", 10, 150],
  ["Dawn Bread Large", "8961000000141", "Bakery", "Dawn Foods", 160, 190, 20, "piece", 5, 2],
  ["Dawn Burger Buns (6 pcs)", "8961000000158", "Bakery", "Dawn Foods", 120, 150, 15, "pack", 5, -1],
  ["Rusk 300g", "8961000000165", "Bakery", "Dawn Foods", 200, 240, 10, "pack", 4, 60],
  ["Bananas", "8961000000172", "Fruits and Vegetables", "Local Fresh Market", 150, 200, 25, "kg", 5, 4],
  ["Apples", "8961000000189", "Fruits and Vegetables", "Local Fresh Market", 300, 380, 30, "kg", 5, 14],
  ["Potatoes", "8961000000196", "Fruits and Vegetables", "Local Fresh Market", 80, 110, 60, "kg", 10, 20],
  ["Tomatoes", "8961000000202", "Fruits and Vegetables", "Local Fresh Market", 120, 160, 6, "kg", 8, 5],
  ["Surf Excel 1kg", "8961000000219", "Household", "Unilever Pakistan", 650, 750, 15, "pack", 5, null],
  ["Vim Dishwash Bar", "8961000000226", "Household", "Unilever Pakistan", 70, 90, 40, "piece", 10, null],
  ["Harpic Toilet Cleaner 500ml", "8961000000233", "Household", "Local Fresh Market", 280, 330, 3, "piece", 5, null],
  ["Lifebuoy Soap", "8961000000240", "Personal Care", "Unilever Pakistan", 110, 140, 0, "piece", 10, null],
  ["Sunsilk Shampoo 360ml", "8961000000257", "Personal Care", "Unilever Pakistan", 520, 600, 14, "piece", 5, null],
  ["Colgate Toothpaste 150g", "8961000000264", "Personal Care", "Colgate-Palmolive Pakistan", 260, 310, 22, "piece", 6, null],
  ["Shan Biryani Masala", "8961000000271", "Grocery", "Shan Foods", 120, 150, 30, "pack", 10, 300],
  ["Cooking Oil 1L", "8961000000288", "Grocery", "Local Fresh Market", 520, 580, 20, "liter", 6, 240],
  ["Basmati Rice 1kg", "8961000000295", "Grocery", "Local Fresh Market", 330, 400, 35, "kg", 10, 365],
];

async function addIfMissing(Model, filter, data) {
  const existing = await Model.findOne(filter);
  if (existing) return { doc: existing, added: false };
  const doc = await Model.create({ ...filter, ...data });
  return { doc, added: true };
}

async function createSales() {
  const inStock = await Product.find({ stock: { $gt: 0 } });
  let count = 0;

  for (let day = 6; day >= 0; day--) {
    const salesToday = rand(3, 8);
    for (let i = 0; i < salesToday; i++) {
      const when = new Date();
      when.setDate(when.getDate() - day);
      when.setHours(rand(9, 21), rand(0, 59), rand(0, 59), 0);
      if (when > new Date()) continue;

      const lines = [];
      for (const p of shuffle(inStock).slice(0, rand(1, 4))) {
        const quantity = rand(1, 3);
        const result = await Product.updateOne(
          { _id: p._id, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } }
        );
        if (result.modifiedCount === 0) continue;
        lines.push({
          product: p._id,
          name: p.name,
          price: p.salePrice,
          quantity,
          total: money(p.salePrice * quantity),
        });
      }
      if (lines.length === 0) continue;

      const subtotal = money(lines.reduce((s, l) => s + l.total, 0));
      const tax = money(subtotal * 0.18);
      const total = money(subtotal + tax);
      const paymentMethod = Math.random() < 0.6 ? "cash" : "card";
      const amountPaid = paymentMethod === "cash" ? Math.ceil(total / 100) * 100 : total;

      const sale = new Sale({
        invoiceNo: "INV-" + (when.getTime() + i),
        items: lines,
        subtotal,
        discount: 0,
        tax,
        total,
        paymentMethod,
        amountPaid,
        change: money(amountPaid - total),
        createdAt: when,
        updatedAt: when,
      });
      await sale.save({ timestamps: false });
      count++;
    }
  }
  console.log(`Sales: ${count} demo sales created over the last 7 days`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const catIds = {};
  let newCats = 0;
  for (const c of categories) {
    const { doc, added } = await addIfMissing(Category, { name: c.name }, { description: c.description });
    catIds[c.name] = doc._id;
    if (added) newCats++;
  }
  console.log(`Categories: ${newCats} added, ${categories.length - newCats} already existed`);

  const supIds = {};
  let newSups = 0;
  for (const s of suppliers) {
    const { name, ...rest } = s;
    const { doc, added } = await addIfMissing(Supplier, { name }, rest);
    supIds[name] = doc._id;
    if (added) newSups++;
  }
  console.log(`Suppliers: ${newSups} added, ${suppliers.length - newSups} already existed`);

  let newProducts = 0;
  for (const [name, barcode, cat, sup, cost, sale, stock, unit, low, expiry] of products) {
    const { added } = await addIfMissing(
      Product,
      { barcode },
      {
        name,
        category: catIds[cat],
        supplier: supIds[sup],
        costPrice: cost,
        salePrice: sale,
        stock,
        unit,
        lowStockLimit: low,
        expiryDate: expiry === null ? undefined : daysFromNow(expiry),
      }
    );
    if (added) newProducts++;
  }
  console.log(`Products: ${newProducts} added, ${products.length - newProducts} already existed`);

  if (process.argv.includes("--with-sales")) {
    await createSales();
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});