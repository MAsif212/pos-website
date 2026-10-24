import Dexie from "dexie";

// The local database on this device (lives inside the browser)
export const db = new Dexie("freshmart_pos");

// Tables and the fields we search or sort by.
// The FIRST field in each list is the unique key.
db.version(1).stores({
  // Sales made offline, waiting to be uploaded
  // status: "pending" | "syncing" | "failed"
  pendingSales: "clientId, status, createdAt",

  // Copies of the catalog, so Checkout works offline
  products: "_id, barcode, name",
  categories: "_id, name",

  // Small settings, like when the catalog was last saved
  meta: "key",
});

// Ask the browser to keep this data even when the device is low on space.
// Installed apps usually get this automatically; it's a safety net.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Not supported: data is still saved, just with normal browser rules
  }
  return false;
}

// Open the database when the app starts
export async function openLocalDb() {
  try {
    await db.open();
    const persistent = await requestPersistentStorage();
    console.info(
      `Local database ready (${persistent ? "persistent" : "normal"} storage)`
    );
  } catch (err) {
    console.error("Local database could not be opened:", err);
  }
}