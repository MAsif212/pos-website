// Catches Chrome's "this app can be installed" event as early as possible,
// keeps it, and lets the Install button use it later.

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(deferredPrompt));

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // stop Chrome's own mini popup; our button shows instead
    deferredPrompt = e;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export const getInstallPrompt = () => deferredPrompt;

// Lets a component react when installing becomes possible (or not)
export const onInstallPromptChange = (fn) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

// True when the app is already running as an installed app
export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// Shows Chrome's install popup; returns "accepted" or "dismissed"
export async function promptInstall() {
  if (!deferredPrompt) return null;
  const event = deferredPrompt;
  deferredPrompt = null; // the event can only be used once
  notify();
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}