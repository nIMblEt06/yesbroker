"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const DISMISS_KEY = "ba.installhint.v1";

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "dismissed") return;
    } catch {
      return;
    }
    setDismissed(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || !deferred) return null;

  return (
    <div className="mx-auto mt-4 flex max-w-xl items-center justify-between gap-3 rounded-[4px] border border-line bg-brand-soft px-3 py-2">
      <p className="text-xs text-muted">
        Tip: install YesBroker and you can share broker contacts straight here
        from WhatsApp or your phone book.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            void deferred.prompt();
            setDismissed(true);
          }}
        >
          Install
        </button>
        <button
          aria-label="Dismiss"
          className="px-1 text-muted hover:text-danger"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, "dismissed");
            } catch {}
            setDismissed(true);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
