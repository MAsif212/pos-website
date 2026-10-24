import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { db } from "../offline/db";
import { useOnline } from "../offline/useSync";

const timeOf = (ms) =>
  new Date(ms).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

export default function SyncStatus({ syncNow, syncing, lastSyncAt }) {
  const online = useOnline();

  // These update by themselves whenever the local database changes
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

  return (
    <div className="rounded-xl bg-cocoa-dark p-3 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <span
            className={`h-2.5 w-2.5 rounded-full ${online ? "bg-green-400" : "bg-amber-400"}`}
          />
          {online ? "Online" : "Offline"}
        </span>
        <button
          onClick={() => syncNow({ manual: true })}
          disabled={!online || syncing}
          aria-label="Sync now"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-sand hover:bg-cocoa-light disabled:opacity-40"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <p className={waiting > 0 ? "font-semibold text-amber-300" : "text-sand"}>
        {waiting > 0
          ? `${waiting} sale${waiting > 1 ? "s" : ""} waiting to sync`
          : "All sales synced"}
      </p>

      {failed > 0 && (
        <p className="mt-1 flex items-center gap-1 font-semibold text-red-300">
          <AlertTriangle size={14} /> {failed} sale{failed > 1 ? "s" : ""} couldn't sync
        </p>
      )}

      {lastSyncAt && <p className="mt-1 text-xs text-sand/70">Last checked {timeOf(lastSyncAt)}</p>}
    </div>
  );
}