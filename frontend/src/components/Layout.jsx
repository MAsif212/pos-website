import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import toast from "react-hot-toast";
import { useLiveQuery } from "dexie-react-hooks";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Truck,
  Receipt,
  AlertTriangle,
  Users as UsersIcon,
  LogOut,
  Menu,
  X,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../offline/db";
import { useOnline, useSyncEngine } from "../offline/useSync";
import InstallButton from "./InstallButton";
import SyncStatus from "./SyncStatus";
import Modal from "./Modal";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/checkout", label: "Checkout", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["admin"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin"] },
  { to: "/sales", label: "Sales history", icon: Receipt, roles: ["admin", "cashier"] },
  { to: "/low-stock", label: "Low stock", icon: AlertTriangle, roles: ["admin"] },
  { to: "/users", label: "Users", icon: UsersIcon, roles: ["admin"] },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [syncingForLogout, setSyncingForLogout] = useState(false);
  const { user, logout } = useAuth();
  const online = useOnline();
  const isAdmin = user.role === "admin";

  // Upload offline sales automatically while someone is logged in
  const sync = useSyncEngine();

  // Sales still on this device
  const waiting = useLiveQuery(
    () => db.pendingSales.where("status").anyOf("pending", "syncing").count(),
    [],
    0
  );
  const failed = useLiveQuery(
    () => db.pendingSales.where("status").equals("failed").count(),
    [],
    0
  );
  const unsynced = waiting + failed;

  const handleLogout = () => {
    if (unsynced > 0) setLogoutOpen(true);
    else logout();
  };

  // Try to upload; if nothing is left on the device, log out
  const syncThenLogout = async () => {
    setSyncingForLogout(true);
    try {
      await sync.syncNow();
      const left = await db.pendingSales.count();
      if (left === 0) {
        toast.success("All sales synced. Logging out.");
        setLogoutOpen(false);
        logout();
      } else {
        toast.error(`${plural(left, "sale")} still not synced.`);
      }
    } finally {
      setSyncingForLogout(false);
    }
  };

  const forceLogout = () => {
    setLogoutOpen(false);
    logout();
  };

  const visibleLinks = links.filter((l) => l.roles.includes(user.role));
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-cocoa px-4 py-3 text-cream lg:hidden">
        <span className="font-serif text-xl tracking-[0.2em]">FRESHMART</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 hover:bg-cocoa-light"
        >
          <Menu size={26} />
        </button>
      </header>

      {/* Dark overlay behind the mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-cocoa text-cream transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 pt-7 pb-6">
          <div>
            <p className="font-serif text-2xl tracking-[0.2em]">FRESHMART</p>
            <p className="mt-1 text-sm text-sand">Supermarket POS</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 hover:bg-cocoa-light lg:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  isActive ? "bg-cream text-cocoa" : "text-cream/90 hover:bg-cocoa-light"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Online / offline and sync status */}
        <div className="px-3 pt-3">
          <SyncStatus {...sync} />
        </div>

        {/* Install button (only shows when the app can be installed) */}
        <div className="px-3 pt-3">
          <InstallButton />
        </div>

        {/* Logged-in user */}
        <div className="m-3 rounded-xl bg-cocoa-dark p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream font-bold text-cocoa">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="text-sm capitalize text-sand">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-sand/40 py-2 text-sm font-semibold hover:bg-cocoa-light"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Logout with unsynced sales */}
      <Modal
        open={logoutOpen}
        title="Sales not synced yet"
        onClose={() => !syncingForLogout && setLogoutOpen(false)}
      >
        <div className="space-y-4">
          {waiting > 0 && (
            <p className="text-lg">
              <span className="font-bold">{plural(waiting, "sale")}</span>{" "}
              {waiting === 1 ? "is" : "are"} saved on this device and not uploaded yet.
            </p>
          )}

          {failed > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              {plural(failed, "sale")} couldn't sync and{" "}
              {failed === 1 ? "needs" : "need"} the admin to check{failed === 1 ? " it" : " them"}.
            </p>
          )}

          {!online && waiting > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
              <WifiOff size={20} className="mt-0.5 shrink-0" />
              You're offline. Connect to the internet, then tap Sync now.
            </p>
          )}

          <p className="text-mocha">
            {isAdmin
              ? "Sync them now, or log out anyway: they stay on this device and sync after the next login."
              : "Sync them before logging out, so no sales are left on this device."}
          </p>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {waiting > 0 && (
              <button
                className="btn btn-primary flex-1"
                onClick={syncThenLogout}
                disabled={!online || syncingForLogout}
              >
                <RefreshCw size={18} className={syncingForLogout ? "animate-spin" : ""} />
                {syncingForLogout ? "Syncing…" : "Sync now"}
              </button>
            )}
            {isAdmin && (
              <button
                className="btn btn-danger flex-1"
                onClick={forceLogout}
                disabled={syncingForLogout}
              >
                <LogOut size={18} /> Log out anyway
              </button>
            )}
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setLogoutOpen(false)}
              disabled={syncingForLogout}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}