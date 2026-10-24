import { db } from "./db";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const money = (n) => Math.round(n * 100) / 100;

// A unique ID for each sale, made on this device
export function newClientId() {
  if (crypto.randomUUID) return crypto.randomUUID();

  // Fallback for older browsers: same UUID format
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Final invoice number made on the device, e.g. INV-1792842179854-K7Q2
function newOfflineInvoiceNo() {
  const random = crypto.getRandomValues(new Uint32Array(4));
  const suffix = [...random].map((n) => CHARS[n % CHARS.length]).join("");
  return `INV-${Date.now()}-${suffix}`;
}

// Save a sale on this device when the server can't be reached.
// Returns a receipt that looks like a normal one, marked as offline.
export async function saveSaleOffline({
  clientId,
  cart,
  discount,
  taxRate,
  paymentMethod,
  amountPaid,
  customerName,
  cashier,
}) {
  const soldAt = new Date().toISOString();
  const invoiceNo = newOfflineInvoiceNo();

  // The prices the customer is paying right now (decision 2A)
  const items = cart.map(({ product, quantity }) => ({
    product: product._id,
    name: product.name,
    price: product.salePrice,
    quantity,
  }));
  const lines = items.map((i) => ({ ...i, total: money(i.price * i.quantity) }));

  // Same calculation as the server
  const subtotal = money(lines.reduce((sum, l) => sum + l.total, 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const rate = Number(taxRate) || 0;
  const tax = money(((subtotal - safeDiscount) * rate) / 100);
  const total = money(subtotal - safeDiscount + tax);
  const paid = paymentMethod === "card" ? total : Number(amountPaid) || 0;

  // What will be sent to the server later
  const payload = {
    clientId,
    items,
    discount: safeDiscount,
    taxRate: rate,
    paymentMethod,
    amountPaid: paid,
    customerName: customerName || undefined,
    offline: { soldAt, invoiceNo, cashierId: cashier._id },
  };

  // What the cashier sees and prints now
  const receipt = {
    _id: clientId,
    invoiceNo,
    createdAt: soldAt,
    items: lines,
    subtotal,
    discount: safeDiscount,
    tax,
    total,
    paymentMethod,
    amountPaid: paid,
    change: money(paid - total),
    customerName: customerName || "Walk-in customer",
    cashierName: cashier.name,
    status: "completed",
    offline: true,
  };

  // Save the sale and reduce stock on this device, all or nothing
  await db.transaction("rw", db.pendingSales, db.products, async () => {
    await db.pendingSales.add({
      clientId,
      status: "pending",
      createdAt: Date.now(),
      payload,
      receipt,
      attempts: 0,
      lastError: null,
    });
    for (const item of items) {
      const product = await db.products.get(item.product);
      if (product) {
        await db.products.update(item.product, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }
  });

  return receipt;
}