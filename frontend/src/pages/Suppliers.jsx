import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Truck, Phone, Mail, MapPin } from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/suppliers");
      setSuppliers(data);
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

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Enter a supplier name");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${s._id}`);
      toast.success("Supplier deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const field = (key, label, placeholder, type = "text") => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={20} /> Add supplier
        </button>
      </PageHeader>

      <div className="relative mb-6 max-w-md">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha" />
        <input
          className="input pl-10"
          placeholder="Search suppliers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-mocha">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <Truck size={40} className="mx-auto mb-3 text-mocha" />
          <p className="text-lg font-semibold">No suppliers found</p>
          <p className="text-mocha">Add the companies that deliver stock to your store.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s._id} className="card flex flex-col">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-xl bg-cream-dark p-2.5">
                  <Truck size={22} />
                </div>
                <h3 className="text-lg font-semibold">{s.name}</h3>
              </div>
              <div className="mb-4 flex-1 space-y-1.5 text-mocha">
                <p className="flex items-center gap-2">
                  <Phone size={16} /> {s.phone || "No phone"}
                </p>
                <p className="flex items-center gap-2 break-all">
                  <Mail size={16} className="shrink-0" /> {s.email || "No email"}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="shrink-0" /> {s.address || "No address"}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => openEdit(s)}>
                  <Pencil size={18} /> Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(s)}
                  aria-label={`Delete ${s.name}`}
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
        title={editingId ? "Edit supplier" : "Add supplier"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {field("name", "Name", "Shan Foods")}
          {field("phone", "Phone", "0300-1234567", "tel")}
          {field("email", "Email", "orders@shanfoods.com", "email")}
          {field("address", "Address", "Karachi, Pakistan")}
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