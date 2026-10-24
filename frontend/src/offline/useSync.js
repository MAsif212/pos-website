import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { resetStuckSales, syncPendingSales } from "./sync";

const SYNC_EVERY_MS = 30 * 1000;

// true/false, updates when the connection changes
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// Runs the sync on start, every 30 seconds, and when the internet returns
export function useSyncEngine() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const running = useRef(false);

  // Returns what happened, so callers (like the logout popup) can react
  const syncNow = useCallback(async ({ manual = false } = {}) => {
    const empty = { ran: false, synced: 0, newlyFailed: 0, reason: null };
    if (running.current) return { ...empty, reason: "Already syncing." };

    running.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingSales();
      if (result.synced > 0) {
        toast.success(
          `${result.synced} offline sale${result.synced > 1 ? "s" : ""} synced`
        );
      }
      if (result.newlyFailed > 0) {
        toast.error(
          `${result.newlyFailed} sale${result.newlyFailed > 1 ? "s" : ""} couldn't sync. The admin needs to check.`
        );
      }
      if (manual && result.synced === 0 && result.reason) toast(result.reason);
      if (result.ran) setLastSyncAt(Date.now());
      return result;
    } catch (err) {
      if (manual) toast.error(`Sync failed: ${err.message}`);
      return { ...empty, reason: err.message };
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    resetStuckSales().then(() => syncNow());
    const timer = setInterval(() => syncNow(), SYNC_EVERY_MS);
    const onOnline = () => syncNow();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [syncNow]);

  return { syncNow, syncing, lastSyncAt };
}