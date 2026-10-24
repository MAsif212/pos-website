import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Banknote,
  CreditCard,
  ScanBarcode,
  X,
  WifiOff,
} from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Receipt from "../components/Receipt";
import { useAuth } from "../context/AuthContext";
import { fetchCatalog } from "../offline/catalog";
import { newClientId, saveSaleOffline } from "../offline/sales";
import { formatRs, formatDate } from "../utils/format";

const money = (n) => Math.round(n * 100) / 100;

export default function Checkout() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogSource, setCatalogSource] = useState("online");
  const [catalogSavedAt, setCatalogSavedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState("");
  const [taxRate, setTaxRate] = useState(18);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef(null);

  // Online: fresh from the server (and saved on the device). Offline: the saved copy.
  const load = async () => {
    try {
      const data = await fetchCatalog();
      setProducts(data.products);
      setCategories(data.categories);
      setCatalogSource(data.source);
      setCatalogSavedAt(data.savedAt);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    searchRef.current?.focus();
  }, []);

  // Stop the page behind from scrolling while the mobile cart is open
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = !activeCat || p.category?._id === activeCat;
      const matchQuery =
        !q || p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [products, query, activeCat]);

  // ---------- Cart actions ----------
  const qtyInCart = (id) => cart.find((i) => i.product._id === id)?.quantity || 0;

  const addToCart = (p) => {
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    const existing = cart.find((i) => i.product._id === p._id);
    if (existing && existing.quantity >= p.stock) {
      return toast.error(`Only ${p.stock} ${p.unit} of ${p.name} in stock`);
    }
    setCart(
      existing
        ? cart.map((i) =>
            i.product._id === p._id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...cart, { product: p, quantity: 1 }]
    );
  };

  const removeItem = (id) => setCart(cart.filter((i) => i.product._id !== id));

  const changeQty = (id, delta) => {
    const item = cart.find((i) => i.product._id === id);
    if (!item) return;
    const next = item.quantity + delta;
    if (next < 1) return removeItem(id);
    if (next > item.product.stock) {
      return toast.error(`Only ${item.product.stock} ${item.product.unit} in stock`);
    }
    setCart(cart.map((i) => (i.product._id === id ? { ...i, quantity: next } : i)));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount("");
    setAmountPaid("");
    setCustomerName("");
  };

  // Enter in the barcode box: exact barcode match, or the only search result
  const handleScan = (e) => {
    if (e.key !== "Enter") return;
    const code = query.trim();
    if (!code) return;
    const exact = products.find((p) => p.barcode === code);
    if (exact) {
      addToCart(exact);
      setQuery("");
    } else if (filtered.length === 1) {
      addToCart(filtered[0]);
      setQuery("");
    } else if (filtered.length === 0) {
      toast.error("No product found for this barcode");
    } else {
      toast("Several matches. Tap the product you want.");
    }
  };

  // ---------- Totals (server recalculates these too) ----------
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = money(cart.reduce((s, i) => s + i.product.salePrice * i.quantity, 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = money(((subtotal - safeDiscount) * (Number(taxRate) || 0)) / 100);
  const total = money(subtotal - safeDiscount + tax);
  const paid = paymentMethod === "card" ? total : Number(amountPaid) || 0;
  const change = money(paid - total);

  const quickCash = [...new Set([Math.ceil(total / 100) * 100, 500, 1000, 5000])]
    .filter((v) => v >= total && v > 0)
    .slice(0, 4);

  // Show the receipt and get ready for the next customer
  const finishSale = (saleReceipt) => {
    setReceipt(saleReceipt);
    setCartOpen(false);
    clearCart();
    load();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (paymentMethod === "cash" && paid < total) {
      return toast.error(`Amount received is less than ${formatRs(total)}`);
    }

    setProcessing(true);

    // One ID for this sale, used online AND offline, so it can never be saved twice
    const clientId = newClientId();
    const details = {
      discount: safeDiscount,
      taxRate: Number(taxRate) || 0,
      paymentMethod,
      amountPaid: paid,
      customerName: customerName.trim() || undefined,
    };

    try {
      // 1. Try the server first (skipped when the device knows it's offline)
      if (navigator.onLine) {
        try {
          const { data } = await api.post(
            "/sales",
            {
              ...details,
              clientId,
              items: cart.map((i) => ({ product: i.product._id, quantity: i.quantity })),
            },
            { timeout: 15000 }
          );
          toast.success(`Sale ${data.invoiceNo} completed`);
          finishSale(data);
          return;
        } catch (err) {
          // The server answered with a real problem (e.g. out of stock): stop here
          if (err.status) {
            toast.error(err.message);
            load();
            return;
          }
          // No answer at all: fall through and save on this device
        }
      }

      // 2. Save on this device; it will sync when the internet is back
      try {
        const offlineReceipt = await saveSaleOffline({
          clientId,
          cart,
          ...details,
          cashier: user,
        });
        toast.success(`Saved offline (${offlineReceipt.invoiceNo}). It will sync automatically.`, {
          duration: 5000,
        });
        finishSale(offlineReceipt);
      } catch (err) {
        toast.error(`Couldn't save the sale on this device: ${err.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    searchRef.current?.focus();
  };

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader title="Checkout" subtitle="Scan or tap products to add them to the cart" />

      {/* Offline banner */}
      {catalogSource === "offline" && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <WifiOff size={20} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">You're offline.</span> Showing products saved on this
            device{catalogSavedAt ? ` on ${formatDate(catalogSavedAt)}` : ""}. Sales are saved
            here and sync when you're back online.
          </p>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- Left: products ---------- */}
        <section className="min-w-0">
          <div className="relative mb-4">
            <ScanBarcode
              size={22}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha"
            />
            <input
              ref={searchRef}
              className="input py-3.5 pl-11 text-lg"
              placeholder="Scan barcode or search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleScan}
            />
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            <Chip active={!activeCat} onClick={() => setActiveCat("")}>
              All
            </Chip>
            {categories.map((c) => (
              <Chip key={c._id} active={activeCat === c._id} onClick={() => setActiveCat(c._id)}>
                {c.name}
              </Chip>
            ))}
          </div>

          {loading ? (
            <p className="text-mocha">Loading products…</p>
          ) : filtered.length === 0 ? (
            <div className="card py-10 text-center text-mocha">No products match.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const inCart = qtyInCart(p._id);
                const out = p.stock <= 0;
                return (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={`relative min-w-0 rounded-2xl border bg-white p-3 text-left transition sm:p-4 ${
                      out
                        ? "cursor-not-allowed border-sand opacity-50"
                        : "border-sand hover:-translate-y-0.5 hover:border-cocoa"
                    } ${inCart ? "border-cocoa ring-2 ring-cocoa/20" : ""}`}
                  >
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-cocoa px-2 text-sm font-bold text-cream">
                        {inCart}
                      </span>
                    )}
                    <p className="mb-1 line-clamp-2 pr-6 font-semibold leading-snug">{p.name}</p>
                    <p className="mb-2 truncate text-xs text-mocha">{p.category?.name || "Other"}</p>
                    <p className="text-lg font-bold">{formatRs(p.salePrice)}</p>
                    <p
                      className={`text-sm ${
                        p.stock <= p.lowStockLimit ? "text-red-700" : "text-mocha"
                      }`}
                    >
                      {out ? "Out of stock" : `${p.stock} ${p.unit} left`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Right: cart (full-screen panel on mobile) ---------- */}
        <aside
          className={`${
            cartOpen ? "fixed inset-0 z-50 overflow-y-auto bg-cream p-4" : "hidden"
          } lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:block lg:self-start lg:overflow-visible lg:bg-transparent lg:p-0`}
        >
          <div className="card flex flex-col gap-4 bg-cream-dark">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
                <ShoppingCart size={24} /> Cart
              </h2>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button
                    className="text-sm font-semibold text-red-700 hover:underline"
                    onClick={clearCart}
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setCartOpen(false)}
                  aria-label="Close cart"
                  className="rounded-lg p-1 hover:bg-sand lg:hidden"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {cart.length === 0 ? (
              <p className="py-6 text-center text-mocha">Cart is empty. Scan or tap a product.</p>
            ) : (
              <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {cart.map(({ product, quantity }) => (
                  <li key={product._id} className="rounded-xl bg-white p-3">
                    <div className="mb-2 flex justify-between gap-2">
                      <p className="font-semibold leading-snug">{product.name}</p>
                      <button
                        onClick={() => removeItem(product._id)}
                        aria-label={`Remove ${product.name}`}
                        className="text-mocha hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QtyButton onClick={() => changeQty(product._id, -1)} label="Decrease">
                          <Minus size={16} />
                        </QtyButton>
                        <span className="w-8 text-center text-lg font-bold">{quantity}</span>
                        <QtyButton onClick={() => changeQty(product._id, 1)} label="Increase">
                          <Plus size={16} />
                        </QtyButton>
                      </div>
                      <p className="font-bold">{formatRs(product.salePrice * quantity)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Discount (Rs)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div>
                <label className="label">GST (%)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl bg-white p-4">
              <Line label={`Subtotal (${itemCount} items)`} value={formatRs(subtotal)} />
              {safeDiscount > 0 && <Line label="Discount" value={"- " + formatRs(safeDiscount)} />}
              <Line label={`GST ${Number(taxRate) || 0}%`} value={formatRs(tax)} />
              <div className="flex justify-between border-t border-sand pt-2 text-2xl font-bold">
                <span>Total</span>
                <span>{formatRs(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <PayButton active={paymentMethod === "cash"} onClick={() => setPaymentMethod("cash")}>
                <Banknote size={20} /> Cash
              </PayButton>
              <PayButton active={paymentMethod === "card"} onClick={() => setPaymentMethod("card")}>
                <CreditCard size={20} /> Card
              </PayButton>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <label className="label">Cash received (Rs)</label>
                <input
                  type="number"
                  min="0"
                  className="input text-lg"
                  placeholder={total ? String(total) : "0"}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
                {quickCash.length > 0 && cart.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickCash.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="rounded-lg border border-cocoa bg-white px-3 py-1.5 text-sm font-semibold hover:bg-cream"
                        onClick={() => setAmountPaid(String(v))}
                      >
                        {formatRs(v)}
                      </button>
                    ))}
                  </div>
                )}
                {cart.length > 0 && Number(amountPaid) > 0 && (
                  <p
                    className={`mt-2 text-lg font-bold ${
                      change < 0 ? "text-red-700" : "text-green-800"
                    }`}
                  >
                    {change < 0
                      ? `Short by ${formatRs(-change)}`
                      : `Change to return: ${formatRs(change)}`}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label">Customer name (optional)</label>
              <input
                className="input"
                placeholder="Walk-in customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary w-full py-4 text-lg"
              onClick={handleCheckout}
              disabled={processing || cart.length === 0}
            >
              {processing ? "Processing…" : `Complete sale · ${formatRs(total)}`}
            </button>
          </div>
        </aside>
      </div>

      {/* ---------- Mobile bottom bar ---------- */}
      {cart.length > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-sand bg-cocoa px-4 py-3 text-cream lg:hidden">
          <div>
            <p className="text-sm text-sand">{itemCount} items</p>
            <p className="text-xl font-bold">{formatRs(total)}</p>
          </div>
          <button
            className="rounded-xl bg-cream px-5 py-3 font-semibold text-cocoa"
            onClick={() => setCartOpen(true)}
          >
            View cart
          </button>
        </div>
      )}

      <Receipt
        sale={receipt}
        title={receipt?.offline ? "Saved offline" : "Sale complete"}
        onClose={closeReceipt}
      />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-cocoa text-cream" : "border border-sand bg-white hover:border-cocoa"
      }`}
    >
      {children}
    </button>
  );
}

function QtyButton({ onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand bg-cream hover:border-cocoa"
    >
      {children}
    </button>
  );
}

function PayButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${
        active ? "bg-cocoa text-cream" : "border border-cocoa bg-white text-cocoa"
      }`}
    >
      {children}
    </button>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between text-mocha">
      <span>{label}</span>
      <span className="font-semibold text-cocoa">{value}</span>
    </div>
  );
}