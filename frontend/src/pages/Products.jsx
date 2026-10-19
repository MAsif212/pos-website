import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Package, Wand2 } from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { formatRs } from "../utils/format";

const emptyForm = {
  name: "",
  barcode: "",
  category: "",
  supplier: "",
  costPrice: "",
  salePrice: "",
  stock: "",
  unit: "piece",
  lowStockLimit: 10,
  expiryDate: "",
};

const units = ["piece", "kg", "liter", "pack"];

const stockStatus = (p) => {
  if (p.stock === 0) return { label: "Out of stock", cls: "bg-red-100 text-red-800" };
  if (p.stock <= p.lowStockLimit) return { label: "Low stock", cls: "bg-amber-100 text-amber-800" };
  return { label: "In stock", cls: "bg-green-100 text-green-800" };
};

const expiryInfo = (p) => {
  if (!p.expiryDate) return null;
  const days = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
  if (days < 0) return { label: "Expired", cls: "bg-red-100 text-red-800" };
  if (days <= 7) return { label: `Expires in ${days}d`, cls: "bg-amber-100 text-amber-800" };
  return null;
};

const Badge = ({ info }) =>
  info ? (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${info.cls}`}>
      {info.label}
    </span>
  ) : null;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [p, c, s] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/suppliers"),
      ]);
      setProducts(p.data);
      setCategories(c.data);
      setSuppliers(s.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.category?._id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      barcode: p.barcode,
      category: p.category?._id || "",
      supplier: p.supplier?._id || "",
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stock: p.stock,
      unit: p.unit,
      lowStockLimit: p.lowStockLimit,
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const generateBarcode = () => {
    let code = "896";
    while (code.length < 13) code += Math.floor(Math.random() * 10);
    setForm({ ...form, barcode: code });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter a product name");
    if (!form.barcode.trim()) return toast.error("Enter or generate a barcode");
    if (form.salePrice === "" || form.costPrice === "") return toast.error("Enter both prices");
    if (Number(form.salePrice) < Number(form.costPrice))
      return toast.error("Sale price can't be lower than cost price");

    const payload = {
      ...form,
      category: form.category || null,
      supplier: form.supplier || null,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      stock: Number(form.stock) || 0,
      lowStockLimit: Number(form.lowStockLimit) || 0,
      expiryDate: form.expiryDate || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/products/${p._id}`);
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} products in store`}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={20} /> Add product
        </button>
      </PageHeader>

      {/* Search and filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha" />
          <input
            className="input pl-10"
            placeholder="Search by name or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-mocha">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <Package size={40} className="mx-auto mb-3 text-mocha" />
          <p className="text-lg font-semibold">No products found</p>
          <p className="text-mocha">Try another search, or add a new product.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left">
              <thead className="border-b border-sand bg-cream-dark text-sm text-mocha">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Expiry</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id} className="border-b border-sand last:border-0 hover:bg-cream/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{p.name}</p>
                      <p className="font-mono text-sm text-mocha">{p.barcode}</p>
                    </td>
                    <td className="px-5 py-4">{p.category?.name || "—"}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{formatRs(p.salePrice)}</p>
                      <p className="text-sm text-mocha">
                        Cost {formatRs(p.costPrice)} · Profit {formatRs(p.salePrice - p.costPrice)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="mb-1 font-semibold">
                        {p.stock} {p.unit}
                      </p>
                      <Badge info={stockStatus(p)} />
                    </td>
                    <td className="px-5 py-4">
                      <p className="mb-1">
                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-PK") : "—"}
                      </p>
                      <Badge info={expiryInfo(p)} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-secondary px-3 py-2"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="btn btn-danger px-3 py-2"
                          onClick={() => handleDelete(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {filtered.map((p) => (
              <div key={p._id} className="card">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{p.name}</p>
                    <p className="font-mono text-sm text-mocha">{p.barcode}</p>
                  </div>
                  <p className="text-lg font-semibold">{formatRs(p.salePrice)}</p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-cream-dark px-2.5 py-0.5 text-xs font-semibold">
                    {p.category?.name || "No category"}
                  </span>
                  <Badge info={stockStatus(p)} />
                  <Badge info={expiryInfo(p)} />
                </div>
                <p className="mb-4 text-mocha">
                  Stock: <span className="font-semibold text-cocoa">{p.stock} {p.unit}</span> ·
                  Profit: <span className="font-semibold text-cocoa">{formatRs(p.salePrice - p.costPrice)}</span>
                </p>
                <div className="flex gap-2">
                  <button className="btn btn-secondary flex-1" onClick={() => openEdit(p)}>
                    <Pencil size={18} /> Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit form */}
      <Modal
        open={modalOpen}
        title={editingId ? "Edit product" : "Add product"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Product name</label>
            <input
              className="input"
              placeholder="Coca-Cola 1.5L"
              value={form.name}
              onChange={setField("name")}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Barcode</label>
            <div className="flex gap-2">
              <input
                className="input font-mono"
                placeholder="8961234567890"
                value={form.barcode}
                onChange={setField("barcode")}
              />
              <button type="button" className="btn btn-secondary shrink-0" onClick={generateBarcode}>
                <Wand2 size={18} /> Generate
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={setField("category")}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier} onChange={setField("supplier")}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cost price (Rs)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="180"
                value={form.costPrice}
                onChange={setField("costPrice")}
              />
            </div>
            <div>
              <label className="label">Sale price (Rs)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="210"
                value={form.salePrice}
                onChange={setField("salePrice")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Stock</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="50"
                value={form.stock}
                onChange={setField("stock")}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={setField("unit")}>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Low stock alert at</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.lowStockLimit}
                onChange={setField("lowStockLimit")}
              />
            </div>
          </div>

          <div>
            <label className="label">Expiry date (optional)</label>
            <input
              type="date"
              className="input"
              value={form.expiryDate}
              onChange={setField("expiryDate")}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : "Save product"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}