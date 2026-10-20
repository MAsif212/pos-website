import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  Eye,
  EyeOff,
  Power,
} from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", username: "", password: "", role: "cashier", active: true };
const USERNAME_RULE = /^[a-z0-9._-]{3,30}$/;

const initialsOf = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const RoleBadge = ({ role }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
      role === "admin" ? "bg-cocoa text-cream" : "bg-cream-dark text-cocoa"
    }`}
  >
    {role === "admin" ? <ShieldCheck size={13} /> : <UserRound size={13} />}
    {role}
  </span>
);

const StatusBadge = ({ active }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    {active ? "Active" : "Disabled"}
  </span>
);

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isMe = (u) => String(u._id) === String(me._id);
  const editingSelf = editing && isMe(editing);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: "", role: u.role, active: u.active });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const username = form.username.trim().toLowerCase();

    if (!name) return toast.error("Enter the person's name");
    if (!editing && !USERNAME_RULE.test(username)) {
      return toast.error("Username must be 3–30 characters: letters, numbers, dot, dash or underscore");
    }
    if (!editing && form.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    if (editing && form.password && form.password.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setSaving(true);
    try {
      if (editing) {
        const payload = { name, role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing._id}`, payload);
        toast.success(form.password ? "User updated and password reset" : "User updated");
      } else {
        await api.post("/users", { name, username, password: form.password, role: form.role });
        toast.success(`${name} can now log in as "${username}"`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    if (isMe(u)) return;
    if (u.active && !window.confirm(`Disable ${u.name}? They won't be able to log in.`)) return;
    try {
      await api.put(`/users/${u._id}`, { active: !u.active });
      toast.success(u.active ? `${u.name} disabled` : `${u.name} enabled`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const q = search.toLowerCase().trim();
  const filtered = users.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || u.username.includes(q)
  );
  const adminCount = users.filter((u) => u.role === "admin").length;
  const activeCount = users.filter((u) => u.active).length;

  const ActionButtons = ({ u, full }) => (
    <>
      <button
        className={`btn btn-secondary ${full ? "flex-1" : "px-3 py-2"}`}
        onClick={() => openEdit(u)}
        aria-label={`Edit ${u.name}`}
      >
        <Pencil size={18} /> {full && "Edit"}
      </button>
      {!isMe(u) && (
        <button
          className={`btn ${u.active ? "btn-danger" : "btn-primary"} ${full ? "flex-1" : "px-3 py-2"}`}
          onClick={() => toggleActive(u)}
          aria-label={u.active ? `Disable ${u.name}` : `Enable ${u.name}`}
        >
          <Power size={18} /> {full && (u.active ? "Disable" : "Enable")}
        </button>
      )}
    </>
  );

  return (
    <>
      <PageHeader title="Users" subtitle="Staff accounts that can log in to the POS">
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={20} /> Add user
        </button>
      </PageHeader>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={users.length} />
        <Stat label="Admins" value={adminCount} />
        <Stat label="Active" value={activeCount} />
      </div>

      <div className="relative mb-6 max-w-md">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha" />
        <input
          className="input pl-10"
          placeholder="Search by name or username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-mocha">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <UsersIcon size={40} className="mx-auto mb-3 text-mocha" />
          <p className="text-lg font-semibold">No users found</p>
          <p className="text-mocha">Add a cashier so they can start making sales.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left">
              <thead className="border-b border-sand bg-cream-dark text-sm text-mocha">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Added</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u._id}
                    className={`border-b border-sand last:border-0 hover:bg-cream/60 ${
                      u.active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-dark font-bold">
                          {initialsOf(u.name)}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {u.name}
                            {isMe(u) && <span className="ml-2 text-sm font-normal text-mocha">(you)</span>}
                          </p>
                          <p className="font-mono text-sm text-mocha">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={u.active} />
                    </td>
                    <td className="px-5 py-4 text-sm text-mocha">
                      {new Date(u.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <ActionButtons u={u} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {filtered.map((u) => (
              <div key={u._id} className={`card ${u.active ? "" : "opacity-60"}`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-dark font-bold">
                    {initialsOf(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {u.name}
                      {isMe(u) && <span className="ml-2 text-sm font-normal text-mocha">(you)</span>}
                    </p>
                    <p className="font-mono text-sm text-mocha">{u.username}</p>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <RoleBadge role={u.role} />
                  <StatusBadge active={u.active} />
                </div>
                <div className="flex gap-2">
                  <ActionButtons u={u} full />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit form */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit user" : "Add user"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              placeholder="Ali Raza"
              value={form.name}
              onChange={setField("name")}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Username</label>
            <input
              className="input font-mono"
              placeholder="ali"
              autoCapitalize="none"
              value={form.username}
              onChange={setField("username")}
              disabled={!!editing}
            />
            <p className="mt-1 text-sm text-mocha">
              {editing
                ? "Usernames can't be changed."
                : "3–30 characters: letters, numbers, dot, dash or underscore."}
            </p>
          </div>

          <div>
            <label className="label">{editing ? "New password (optional)" : "Password"}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="input pr-12"
                placeholder={editing ? "Leave empty to keep the current one" : "At least 6 characters"}
                autoComplete="new-password"
                value={form.password}
                onChange={setField("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mocha hover:text-cocoa"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {["cashier", "admin"].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={editingSelf}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    form.role === r ? "bg-cocoa text-cream" : "border border-cocoa bg-white text-cocoa"
                  }`}
                >
                  {r === "admin" ? <ShieldCheck size={18} /> : <UserRound size={18} />} {r}
                </button>
              ))}
            </div>
            <p className="mt-1 text-sm text-mocha">
              {editingSelf
                ? "You can't change your own role."
                : form.role === "admin"
                ? "Admins can manage products, stock, refunds and users."
                : "Cashiers can only make sales and see their own sales."}
            </p>
          </div>

          {editing && !editingSelf && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3">
              <input
                type="checkbox"
                className="h-5 w-5 accent-cocoa"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span className="font-semibold">Account active (can log in)</span>
            </label>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add user"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-mocha">{label}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
    </div>
  );
}