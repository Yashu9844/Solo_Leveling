import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** final/08's ship checklist — a real install prompt, not just a
 * manifest sitting unused. Android's beforeinstallprompt event is the
 * only reliable cross-browser signal that installing is currently
 * possible; iOS Safari never fires it (no programmatic install there
 * at all), so this card simply never appears on iOS rather than
 * showing a button that would do nothing. */
export function InstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="mt-3 rounded-md border border-border p-3" data-testid="install-card">
      <p className="text-sm text-text">Install this as an app.</p>
      <p className="mt-1 text-xs text-text-faint">Full screen, works offline, no browser chrome.</p>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="mt-2 min-h-[44px] w-full rounded-md border border-accent text-sm text-accent"
      >
        Install
      </button>
    </div>
  );
}
