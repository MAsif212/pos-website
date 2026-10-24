import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Eye,
  RotateCcw,
  Receipt as ReceiptIcon,
  CloudOff,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import Receipt from "../components/Receipt";
import Modal from "../components/Modal";
import FailedSales from "../components/FailedSales";
import { useAuth } from "../context/AuthContext";
import { formatRs, formatDate } from "../utils/format";

const FLAG_INFO = {
  stock_shortage: {
    title: "Stock shortage",
    help: "More was sold offline than the system had in stock. Count the shelf and correct the stock on the Products page.",
  },
  price_changed: {
    title: "Price changed",
    help: "The price changed before this sale synced. The customer paid the price shown on their receipt. No action needed unless that price was wrong.",
  },
  product_missing: {
    title: "Product deleted",
    help: "This product was deleted before the sale synced, so stock wasn't changed. The sale is still recorded.",
  },
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      status === "refunded" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
    }`}
  >
    {status === "refunded" ? "Refunded" : "Completed"}
  </span>
);

const needsReview = (s) => s.flags?.length > 0 && !s.reviewedAt;

// Small extra badges: offline, needs review, reviewed
function SaleBadges({ sale }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <StatusBadge status={sale.status} />
      {sale.wasOffline && (
        <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark px-2.5 py-0.5 text-xs font-semibold text-cocoa">
          <CloudOff size={12} /> Offline
        </span>
      )}
      {needsReview(sale) && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <AlertTriangle size={12} /> Needs review
        </span>
      )}
      {sale.flags?.length > 0 && sale.reviewedAt && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
          <CheckCircle2 size={12} /> Reviewed
        </span>
      )}
    </span>
  );
}

export default function Sales() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("");
  const [viewing, setViewing] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [savingReview, setSavingReview] = useState(false);

  const load = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (from) params.from = new Date(from + "T00:00:00").toISOString();
      if (to) params.to = new Date(to + "T00:00:00").toISOString();
      if (status) params.status = status;
      if (view) params.view = view;
      const { data } = await api.get("/sales", { params });
      setSales(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reload shortly after the filters change
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to, status, view]);

  const handleRefund = async (sale) => {
    if (
      !window.confirm(
        `Refund ${sale.invoiceNo} for ${formatRs(sale.total)}? Stock will be added back.`
      )
    )
      return;
    try {
      await api.put(`/sales/${sale._id}/refund`);
      toast.success(`${sale.invoiceNo} refunded`);
      setViewing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markReviewed = async () => {
    setSavingReview(true);
    try {
      await api.put(`/sales/${reviewing._id}/review`);
      toast.success(`${reviewing.invoiceNo} marked as reviewed`);
      setReviewing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingReview(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setStatus("");
    setView("");
  };

  const canRefund = (s) => isAdmin && s.status === "completed";
  const itemCount = (s) => s.items.reduce((n, i) => n + i.quantity, 0);

  const completed = sales.filter((s) => s.status === "completed");
  const revenue = completed.reduce((sum, s) => sum + s.total, 0);
  const refundedCount = sales.length - completed.length;
  const hasFilters = search || from || to || status || view;

  const Actions = ({ s, full }) => (
    <>
      <button
        className={`btn btn-secondary ${full ? "flex-1" : "px-3 py-2"}`}
        onClick={() => setViewing(s)}
        aria-label={`View ${s.invoiceNo}`}
      >
        <Eye size={18} /> {full && "View"}
      </button>
      {isAdmin && s.flags?.length > 0 && (
        <button
          className={`btn btn-secondary ${full ? "flex-1" : "px-3 py-2"} ${
            needsReview(s) ? "border-amber-500 text-amber-800" : ""
          }`}
          onClick={() => setReviewing(s)}
          aria-label={`Review ${s.invoiceNo}`}
        >
          <AlertTriangle size={18} /> {full && "Review"}
        </button>
      )}
      {canRefund(s) && (
        <button
          className={`btn btn-danger ${full ? "flex-1" : "px-3 py-2"}`}
          onClick={() => handleRefund(s)}
          aria-label={`Refund ${s.invoiceNo}`}
        >
          <RotateCcw size={18} /> {full && "Refund"}
        </button>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={isAdmin ? "Sales history" : "My sales"}
        subtitle={
          isAdmin ? "Every bill, with reprint and refund" : "Sales you made, with receipt reprint"
        }
      />

      <FailedSales isAdmin={isAdmin} />

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Sales shown" value={sales.length} />
        <Stat label="Revenue (completed)" value={formatRs(revenue)} />
        <Stat label="Refunded" value={refundedCount} />
      </div>

      {/* Filters */}
      <div
        className={`card mb-6 grid gap-3 sm:grid-cols-2 lg:items-end ${
          isAdmin
            ? "lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr_auto]"
            : "lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]"
        }`}
      >
        <div>
          <label className="label">Invoice number</label>
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-mocha" />
            <input
              className="input pl-10"
              placeholder="INV-1792"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="label">Show</label>
            <select className="input" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="">All sales</option>
              <option value="review">Needs review</option>
              <option value="offline">Offline sales</option>
            </select>
          </div>
        )}
        <button className="btn btn-secondary" onClick={clearFilters} disabled={!hasFilters}>
          Clear
        </button>
      </div>

      {loading ? (
        <p className="text-mocha">Loading…</p>
      ) : sales.length === 0 ? (
        <div className="card py-12 text-center">
          <ReceiptIcon size={40} className="mx-auto mb-3 text-mocha" />
          <p className="text-lg font-semibold">
            {view === "review" ? "Nothing needs review" : "No sales found"}
          </p>
          <p className="text-mocha">
            {hasFilters ? "Try different filters." : "Complete a sale on the Checkout page."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left">
              <thead className="border-b border-sand bg-cream-dark text-sm text-mocha">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  {isAdmin && <th className="px-5 py-3 font-semibold">Cashier</th>}
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id} className="border-b border-sand last:border-0 hover:bg-cream/60">
                    <td className="px-5 py-4 font-mono text-sm font-semibold">{s.invoiceNo}</td>
                    <td className="px-5 py-4 text-sm">{formatDate(s.createdAt)}</td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-sm">
                        {s.cashierName || <span className="text-mocha">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-4">{itemCount(s)}</td>
                    <td className="px-5 py-4 capitalize">{s.paymentMethod}</td>
                    <td className="px-5 py-4 font-semibold">{formatRs(s.total)}</td>
                    <td className="px-5 py-4">
                      <SaleBadges sale={s} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Actions s={s} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {sales.map((s) => (
              <div key={s._id} className="card">
                <div className="mb-2 min-w-0">
                  <p className="truncate font-mono font-semibold">{s.invoiceNo}</p>
                  <p className="text-sm text-mocha">{formatDate(s.createdAt)}</p>
                  {isAdmin && s.cashierName && (
                    <p className="text-sm text-mocha">Cashier: {s.cashierName}</p>
                  )}
                </div>
                <div className="mb-3">
                  <SaleBadges sale={s} />
                </div>
                <p className="mb-4 text-mocha">
                  {itemCount(s)} items · <span className="capitalize">{s.paymentMethod}</span> ·{" "}
                  <span className="text-lg font-bold text-cocoa">{formatRs(s.total)}</span>
                </p>
                <div className="flex gap-2">
                  <Actions s={s} full />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Receipt
        sale={viewing}
        title={viewing ? `Invoice ${viewing.invoiceNo}` : ""}
        onClose={() => setViewing(null)}
      />

      {/* Review a flagged sale */}
      <Modal
        open={!!reviewing}
        title={reviewing ? `Review ${reviewing.invoiceNo}` : ""}
        onClose={() => !savingReview && setReviewing(null)}
      >
        {reviewing && (
          <div className="space-y-4">
            <p className="text-mocha">
              Made offline on {formatDate(reviewing.createdAt)} by{" "}
              {reviewing.cashierName || "unknown"}
              {reviewing.syncedAt ? `, synced ${formatDate(reviewing.syncedAt)}` : ""}.
            </p>

            <ul className="space-y-3">
              {reviewing.flags.map((flag, i) => (
                <li key={i} className="rounded-xl bg-white p-4">
                  <p className="flex items-center gap-2 font-semibold text-amber-800">
                    <AlertTriangle size={18} />
                    {FLAG_INFO[flag.code]?.title || flag.code}: {flag.productName}
                  </p>
                  <p className="mt-1 font-semibold">{flag.message}</p>
                  <p className="mt-1 text-sm text-mocha">{FLAG_INFO[flag.code]?.help}</p>
                </li>
              ))}
            </ul>

            {reviewing.reviewedAt ? (
              <p className="flex items-center gap-2 font-semibold text-green-800">
                <CheckCircle2 size={18} /> Reviewed by {reviewing.reviewedBy} on{" "}
                {formatDate(reviewing.reviewedAt)}
              </p>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setReviewing(null)}
                disabled={savingReview}
              >
                Close
              </button>
              {!reviewing.reviewedAt && (
                <button
                  className="btn btn-primary flex-1"
                  onClick={markReviewed}
                  disabled={savingReview}
                >
                  <CheckCircle2 size={18} /> {savingReview ? "Saving…" : "Mark as reviewed"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-mocha">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}