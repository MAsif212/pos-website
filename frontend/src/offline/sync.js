import api, { AUTH_STORAGE_KEY } from "../api/axios";
import { db } from "./db";

// Problems that usually fix themselves: try again later
const isTemporary = (err) =>
  !err.status || [401, 408, 429].includes(err.status) || err.status >= 500;

const hasLogin = () => {
  try {
    return !!JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))?.token;
  } catch {
    return false;
  }
};

// If the app closed in the middle of a sync, those sales go back to "pending"
export async function resetStuckSales() {
  await db.pendingSales.where("status").equals("syncing").modify({ status: "pending" });
}

async function runSync() {
  const result = { ran: false, synced: 0, newlyFailed: 0, reason: null };

  if (!navigator.onLine) return { ...result, reason: "You're offline." };
  if (!hasLogin()) return { ...result, reason: "Log in to sync." };

  result.ran = true;

  // Oldest first, so sales reach the server in the order they happened
  const queue = await db.pendingSales.where("status").equals("pending").sortBy("createdAt");
  if (queue.length === 0) return { ...result, reason: "Nothing to sync." };

  for (const sale of queue) {
    await db.pendingSales.update(sale.clientId, { status: "syncing", lastTriedAt: Date.now() });

    try {
      // 201 = saved now, 200 = the server already had it (never saved twice)
      await api.post("/sales", sale.payload, { timeout: 15000 });
      await db.pendingSales.delete(sale.clientId);
      result.synced += 1;
    } catch (err) {
      const attempts = (sale.attempts || 0) + 1;

      if (isTemporary(err)) {
        // Internet, server or login problem: keep it and stop for now
        await db.pendingSales.update(sale.clientId, {
          status: "pending",
          attempts,
          lastError: err.message,
        });
        return { ...result, reason: err.message };
      }

      // The server refused this sale: keep it for the admin and move on
      await db.pendingSales.update(sale.clientId, {
        status: "failed",
        attempts,
        lastError: err.message,
      });
      result.newlyFailed += 1;
    }
  }

  return result;
}

// Only one tab syncs at a time
export async function syncPendingSales() {
  if (navigator.locks?.request) {
    return navigator.locks.request("freshmart-sync", { ifAvailable: true }, (lock) =>
      lock
        ? runSync()
        : { ran: false, synced: 0, newlyFailed: 0, reason: "Already syncing in another window." }
    );
  }
  return runSync();
}