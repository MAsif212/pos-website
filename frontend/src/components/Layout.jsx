import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Truck,
  Receipt,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/checkout", label: "Checkout", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/sales", label: "Sales history", icon: Receipt },
  { to: "/low-stock", label: "Low stock", icon: AlertTriangle },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

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
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-cocoa text-cream transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 pt-7 pb-8">
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

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  isActive
                    ? "bg-cream text-cocoa"
                    : "text-cream/90 hover:bg-cocoa-light"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <p className="px-6 py-5 text-xs text-sand">Admin panel</p>
      </aside>

      {/* Page content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}