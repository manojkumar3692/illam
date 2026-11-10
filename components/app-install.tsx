"use client";
import { useEffect, useState } from "react";
import { Smartphone, Check } from "lucide-react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let pendingInstall: InstallPrompt | null = null;
export function AppRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const ready = (e: Event) => {
      e.preventDefault();
      pendingInstall = e as InstallPrompt;
      window.dispatchEvent(new Event("illam-install-ready"));
    };
    const done = () => {
      pendingInstall = null;
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return null;
}
export default function AppInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false),
    [help, setHelp] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const check = () =>
      setInstalled(
        media.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const ready = () => setPrompt(pendingInstall);
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    check();
    ready();
    window.addEventListener("illam-install-ready", ready);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", check);
    return () => {
      window.removeEventListener("illam-install-ready", ready);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", check);
    };
  }, []);
  return (
    <>
      <section className="install-card">
        <Smartphone size={28} />
        <div className="grow">
          <strong>
            {installed
              ? "ILLAM is on your home screen"
              : "Keep ILLAM on your phone"}
          </strong>
          <p>
            {installed
              ? "Open it here whenever you need it."
              : "One tap to open. Just like an app."}
          </p>
        </div>
        {installed ? (
          <Check size={22} />
        ) : (
          <button
            onClick={async () => {
              if (prompt) {
                try {
                  await prompt.prompt();
                  await prompt.userChoice;
                  pendingInstall = null;
                  setPrompt(null);
                } catch {
                  setError(
                    "Use your browser menu to add ILLAM to your home screen.",
                  );
                  setHelp(true);
                }
              } else setHelp(!help);
            }}
          >
            Install
          </button>
        )}
      </section>
      {help && !installed && (
        <div className="install-help">
          <h3>Add to your home screen</h3>
          <p>
            <strong>iPhone:</strong> Open this page in Safari. Tap Share, then
            Add to Home Screen.
          </p>
          <p>
            <strong>Android:</strong> Open this page in Chrome. Tap the ⋮ menu,
            then Install app or Add to Home screen.
          </p>
          <small>
            Your saved project stays with your account. Internet is needed to
            load and save real project data.
          </small>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}
