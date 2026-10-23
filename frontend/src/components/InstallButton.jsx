import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
import {
  getInstallPrompt,
  onInstallPromptChange,
  promptInstall,
  isInstalled,
} from "../utils/installPrompt";

export default function InstallButton() {
  const [canInstall, setCanInstall] = useState(() => !!getInstallPrompt() && !isInstalled());

  useEffect(() => {
    return onInstallPromptChange((prompt) => setCanInstall(!!prompt && !isInstalled()));
  }, []);

  if (!canInstall) return null;

  const handleClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("FreshMart POS installed");
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream py-2.5 font-semibold text-cocoa transition-colors hover:bg-sand"
    >
      <Download size={18} /> Install app
    </button>
  );
}