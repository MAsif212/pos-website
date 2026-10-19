import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Tags } from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";

const emptyForm = { name: "", description: "" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat._id);
    setForm({ name: cat.name, description: cat.description || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter a category name");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        toast.success("Category updated");
      } else {
        await api.post("/categories", form);
        toast.success("Category added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Categories" subtitle={`${categories.length} categories`}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={20} /> Add category
        </button>
      </PageHeader>

      <div className="relative mb-6 max-w-md">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha" />
        <input
          className="input pl-10"
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-mocha">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <Tags size={40} className="mx-auto mb-3 text-mocha" />
          <p className="text-lg font-semibold">No categories found</p>
          <p className="text-mocha">Add your first category, like Dairy or Beverages.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <div key={cat._id} className="card flex flex-col">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-xl bg-cream-dark p-2.5">
                  <Tags size={22} />
                </div>
                <h3 className="text-lg font-semibold">{cat.name}</h3>
              </div>
              <p className="mb-4 flex-1 text-mocha">
                {cat.description || "No description"}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => openEdit(cat)}>
                  <Pencil size={18} /> Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(cat)}
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingId ? "Edit category" : "Add category"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="Beverages"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Soft drinks, juices, water"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}