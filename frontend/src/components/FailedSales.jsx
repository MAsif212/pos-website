import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import toast from "react-hot-toast";
import { AlertTriangle, Eye, RotateCw, Trash2 } from "lucide-react";
import { db } from "../offline/db";
import { syncPendingSales } from "../offline/sync";
import Receipt from "./Receipt";
import { formatRs, formatDate } from "../utils/format";

export default function FailedSales({ isAdmin }) {
  const failed = useLiveQuery(
    () => db.pendingSales.where("status").equals("failed").sortBy("createdAt"),
    [],
    []
  );
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  if (failed.length === 0) return null;

  const retry = async (sale) => {
    setBusy(true);
    try {
      await db.pendingSales.update(sale.clientId, { status: "pending", lastError: null });
      const result = await syncPendingSales();
      if (result.synced > 0) toast.success(`${sale.receipt.invoiceNo} synced`);
      else if (result.reason) toast(result.reason);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sale) => {
    const ok = window.confirm(
      `Remove ${sale.receipt.invoiceNo} (${formatRs(sale.receipt.total)}) from this device?\n\n` +
        "It was never saved on the server, so it will be gone for good. " +
        "Write down or print its receipt first if the money was taken."
    );
    if (!ok) return;
    await db.pendingSales.delete(sale.clientId);
    toast.success(`${sale.receipt.invoiceNo} removed from this device`);
  };

  return (
    <section className="card mb-6 border-red-300 bg-red-50">
      <h2 className="mb-1 flex items-center gap-2 font-serif text-xl font-semibold text-red-900">
        <AlertTriangle size={22} /> Sales on this device that couldn't sync
      </h2>
      <p className="mb-4 text-red-900">
        The server refused {failed.length === 1 ? "this sale" : "these sales"}.{" "}
        {isAdmin
          ? "Check the reason, then retry or remove."
          : "Ask the admin to check them."}
      </p>

      <ul className="space-y-3">
        {failed.map((sale) => (
          <li
            key={sale.clientId}
            className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-mono font-semibold">{sale.receipt.invoiceNo}</p>
              <p className="text-sm text-mocha">
                {formatDate(sale.receipt.createdAt)} · {sale.receipt.cashierName} ·{" "}
                <span className="font-semibold text-cocoa">{formatRs(sale.receipt.total)}</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-red-800">
                Reason: {sale.lastError || "Unknown"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="btn btn-secondary px-3 py-2"
                onClick={() => setViewing(sale.receipt)}
                aria-label={`View ${sale.receipt.invoiceNo}`}
              >
                <Eye size={18} />
              </button>
              <button
                className="btn btn-secondary px-3 py-2"
                onClick={() => retry(sale)}
                disabled={busy}
                aria-label={`Retry ${sale.receipt.invoiceNo}`}
              >
                <RotateCw size={18} className={busy ? "animate-spin" : ""} />
              </button>
              {isAdmin && (
                <button
                  className="btn btn-danger px-3 py-2"
                  onClick={() => remove(sale)}
                  aria-label={`Remove ${sale.receipt.invoiceNo}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Receipt
        sale={viewing}
        title={viewing ? `Not synced: ${viewing.invoiceNo}` : ""}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}