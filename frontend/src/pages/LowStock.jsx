import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PackagePlus, AlertTriangle, CalendarX, CheckCircle2, Phone } from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { formatRs } from "../utils/format";

const daysLeft = (date) => Math.ceil((new Date(date) - new Date()) / 86400000);

export default function LowStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState(null);
  const [addQty, setAddQty] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lowStock = products
    .filter((p) => p.stock <= p.lowStockLimit)
    .sort((a, b) => a.stock - b.stock);

  const expiring = products
    .filter((p) => p.expiryDate && daysLeft(p.expiryDate) <= 7)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const outCount = lowStock.filter((p) => p.stock === 0).length;
  const expiredCount = expiring.filter((p) => daysLeft(p.expiryDate) < 0).length;

  const openRestock = (p) => {
    setRestocking(p);
    setAddQty("");
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    const qty = Number(addQty);
    if (!qty || qty <= 0) return toast.error("Enter a quantity above 0");
    setSaving(true);
    try {
      await api.put(`/products/${restocking._id}`, { stock: restocking.stock + qty });
      toast.success(`Added ${qty} ${restocking.unit} of ${restocking.name}`);
      setRestocking(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Low stock" />
        <p className="text-mocha">Loading…</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Low stock" subtitle="Items to reorder and items to remove from shelves" />

      {/* Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Out of stock" value={outCount} tone="red" />
        <Stat label="Running low" value={lowStock.length - outCount} tone="amber" />
        <Stat label="Expired or expiring" value={expiring.length} tone={expiredCount ? "red" : "amber"} />
      </div>

      {/* Needs restocking */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold">
          <AlertTriangle size={24} /> Needs restocking
        </h2>

        {lowStock.length === 0 ? (
          <AllGood text="All products are above their low stock limit." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lowStock.map((p) => {
              const out = p.stock === 0;
              return (
                <div
                  key={p._id}
                  className={`card flex flex-col border-l-4 ${out ? "border-l-red-700" : "border-l-amber-500"}`}
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold leading-snug">{p.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        out ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {out ? "Out of stock" : "Low stock"}
                    </span>
                  </div>
                  <p className="mb-1 text-mocha">
                    In stock:{" "}
                    <span className="font-bold text-cocoa">
                      {p.stock} {p.unit}
                    </span>{" "}
                    · Alert at {p.lowStockLimit}
                  </p>
                  <p className="mb-1 text-mocha">{p.category?.name || "No category"}</p>
                  <p className="mb-4 flex flex-1 items-start gap-1.5 text-mocha">
                    <Phone size={16} className="mt-1 shrink-0" />
                    {p.supplier?.name || "No supplier set"}
                  </p>
                  <button className="btn btn-primary w-full" onClick={() => openRestock(p)}>
                    <PackagePlus size={18} /> Restock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Expiring */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold">
          <CalendarX size={24} /> Expired or expiring within 7 days
        </h2>

        {expiring.length === 0 ? (
          <AllGood text="Nothing is expiring this week." />
        ) : (
          <div className="card divide-y divide-sand p-0">
            {expiring.map((p) => {
              const d = daysLeft(p.expiryDate);
              const expired = d < 0;
              return (
                <div
                  key={p._id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-mocha">
                      {p.stock} {p.unit} on shelf · worth {formatRs(p.stock * p.costPrice)} at cost
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-mocha">
                      {new Date(p.expiryDate).toLocaleDateString("en-PK")}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        expired ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {expired
                        ? `Expired ${-d} day${-d === 1 ? "" : "s"} ago`
                        : d === 0
                        ? "Expires today"
                        : `${d} day${d === 1 ? "" : "s"} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Restock popup */}
      <Modal
        open={!!restocking}
        title="Restock product"
        onClose={() => setRestocking(null)}
      >
        {restocking && (
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-lg font-semibold">{restocking.name}</p>
              <p className="text-mocha">
                Current stock: {restocking.stock} {restocking.unit}
              </p>
              <p className="text-mocha">Supplier: {restocking.supplier?.name || "Not set"}</p>
            </div>
            <div>
              <label className="label">Quantity received ({restocking.unit})</label>
              <input
                type="number"
                min="1"
                className="input text-lg"
                placeholder="24"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                autoFocus
              />
              {Number(addQty) > 0 && (
                <p className="mt-2 font-semibold text-green-800">
                  New stock will be {restocking.stock + Number(addQty)} {restocking.unit}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setRestocking(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                {saving ? "Saving…" : "Add stock"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "red" ? "text-red-700" : "text-amber-700";
  return (
    <div className="card">
      <p className="text-sm font-semibold text-mocha">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${value > 0 ? color : "text-cocoa"}`}>{value}</p>
    </div>
  );
}

function AllGood({ text }) {
  return (
    <div className="card flex items-center gap-3 text-green-800">
      <CheckCircle2 size={24} />
      <p className="font-semibold">{text}</p>
    </div>
  );
}