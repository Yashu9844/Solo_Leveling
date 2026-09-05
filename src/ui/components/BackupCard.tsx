import { useRef, useState, type ChangeEvent } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { exportSnapshotJson, importSnapshotJson, ImportValidationError } from '../../store/checkpoint';

function triggerDownload(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** final/07 §6 / final/06's Profile "data safety" row — a real,
 * anytime backup, separate from the checkpoint screen's export-before-
 * seal gate (that one also marks a specific checkpoint as exported;
 * this is just "back up right now"). Import is destructive — it
 * replaces the entire local database — so it's a two-step flow: pick a
 * file, read and see a confirmation naming what's about to happen,
 * confirm or cancel. Nothing is written before that second tap. */
export function BackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; json: string; eventCount: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const json = await exportSnapshotJson();
      triggerDownload(`solo-leveling-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
      setDone('Exported.');
      setTimeout(() => setDone(null), 3000);
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setError(null);
    const json = await file.text();
    try {
      const parsed = JSON.parse(json) as { events?: unknown[] };
      const eventCount = Array.isArray(parsed.events) ? parsed.events.length : 0;
      setPendingImport({ fileName: file.name, json, eventCount });
    } catch {
      setError('That file is not valid JSON.');
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setImporting(true);
    setError(null);
    try {
      await importSnapshotJson(pendingImport.json, DEFAULT_CONFIG, realDeps);
      setPendingImport(null);
      setDone('Imported. Reloading…');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(e instanceof ImportValidationError ? e.message : 'Could not import — try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-border p-3" data-testid="backup-card">
      <div className="mb-2 text-xxs uppercase tracking-wide text-text-faint">Data safety</div>

      <button
        type="button"
        disabled={exporting}
        onClick={() => void handleExport()}
        className="min-h-[44px] w-full rounded-md border border-border text-sm text-text disabled:opacity-40"
      >
        {exporting ? 'Exporting…' : 'Export backup'}
      </button>

      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={(e) => void handleFileSelected(e)} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 min-h-[44px] w-full rounded-md border border-border text-sm text-text"
      >
        Import backup
      </button>

      {done && <p className="mt-2 text-xs text-accent">{done}</p>}
      {error && <p className="mt-2 text-xs text-state-alert">{error}</p>}

      {pendingImport && (
        <div className="mt-3 rounded-md border border-state-alert p-3" data-testid="import-confirm">
          <p className="text-sm text-text">
            Replace ALL current data with "{pendingImport.fileName}" ({pendingImport.eventCount} events)?
          </p>
          <p className="mt-1 text-xs text-text-faint">This cannot be undone unless you have another backup.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="min-h-[44px] flex-1 rounded-md border border-border text-sm text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => void handleConfirmImport()}
              className="min-h-[44px] flex-1 rounded-md bg-state-alert text-sm font-medium text-bg disabled:opacity-40"
            >
              {importing ? 'Importing…' : 'Replace and import'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
