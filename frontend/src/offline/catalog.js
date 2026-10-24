import api from "../api/axios";
import { db } from "./db";

// No status = the server never answered (offline, timeout, server down)
const isNetworkError = (err) => !err.status;

// How many of each product are in sales not yet uploaded to the server
async function pendingQuantities() {
  const qty = {};
  const pending = await db.pendingSales.toArray();
  for (const sale of pending) {
    for (const item of sale.payload.items) {
      qty[item.product] = (qty[item.product] || 0) + Number(item.quantity);
    }
  }
  return qty;
}

// Replace the saved copy of products and categories
export async function saveCatalog(products, categories) {
  await db.transaction("rw", db.products, db.categories, db.meta, async () => {
    await db.products.clear();
    await db.products.bulkPut(products.map((p, i) => ({ ...p, _order: i })));
    await db.categories.clear();
    await db.categories.bulkPut(categories.map((c, i) => ({ ...c, _order: i })));
    await db.meta.put({ key: "catalogSavedAt", value: Date.now() });
  });
}

// Read the saved copy, in the same order the server sent it
export async function loadLocalCatalog() {
  const [products, categories, meta] = await Promise.all([
    db.products.toArray(),
    db.categories.toArray(),
    db.meta.get("catalogSavedAt"),
  ]);
  const byOrder = (a, b) => (a._order ?? 0) - (b._order ?? 0);
  return {
    products: products.sort(byOrder),
    categories: categories.sort(byOrder),
    savedAt: meta?.value || null,
  };
}

// Online: get fresh data and save a copy. Offline: use the saved copy.
export async function fetchCatalog() {
  if (navigator.onLine) {
    try {
      const [p, c] = await Promise.all([
        api.get("/products", { timeout: 10000 }),
        api.get("/categories", { timeout: 10000 }),
      ]);

      // Server stock doesn't know about sales still waiting on this device
      const pending = await pendingQuantities();
      const products = p.data.map((product) =>
        pending[product._id]
          ? { ...product, stock: Math.max(0, product.stock - pending[product._id]) }
          : product
      );

      await saveCatalog(products, c.data);
      return { products, categories: c.data, source: "online", savedAt: Date.now() };
    } catch (err) {
      // A real server answer (like "please log in") is a real error
      if (!isNetworkError(err)) throw err;
    }
  }

  const local = await loadLocalCatalog();
  if (local.products.length === 0) {
    throw new Error(
      "You're offline and no products are saved on this device yet. Connect to the internet once to load them."
    );
  }
  return { ...local, source: "offline" };
}