import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { verdictTextFor, type Checkpoint, type ComparisonRow, type GateCondition } from '../../engine/rank';
import {
  getCheckpointReport,
  getCheckpointComparison,
  exportSnapshotJson,
  markExported,
  sealCheckpoint,
  getCurrentRank,
  type CheckpointReport,
} from '../../store/checkpoint';
import { realDeps } from '../../store/deps';
import { RankAdvancedMoment } from '../moments/RankAdvancedMoment';
import { CheckpointMoment } from '../moments/CheckpointMoment';

interface CheckpointScreenProps {
  day: Checkpoint['day'];
  today: string;
  onClose: () => void;
}

function triggerDownload(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** final/06 §5's checkpoint screen and final/01 §4.3's "most important
 * sentence" — the ✓/✗ gate checklist. The mockup also shows manual
 * weight/waist/1RM entry and self-efficacy/automaticity/enjoyment
 * instruments on this same screen; deferred here (see the Slice 12
 * report) — this screen's job is the gate mechanics the Slice 12 done
 * criterion actually names: real evidence, the export gate, sealing,
 * and the verdict text. Body metrics already have their own entry path
 * (store/training.ts's logBodyMetric); the instruments have no engine
 * behind them yet. */
export function CheckpointScreen({ day, today, onClose }: CheckpointScreenProps) {
  const [report, setReport] = useState<CheckpointReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  interface PendingCheckpointMoment {
    rows: ComparisonRow[];
    conditions: GateCondition[];
    verdictText: string;
  }
  const [rankAdvance, setRankAdvance] = useState<{ from: string; to: string; next: PendingCheckpointMoment | null } | null>(null);
  const [checkpointMoment, setCheckpointMoment] = useState<
    (PendingCheckpointMoment & { rankBefore: string; rankAfter: string }) | null
  >(null);

  async function refresh() {
    setReport(await getCheckpointReport(day, today, DEFAULT_CONFIG));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, today]);

  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportSnapshotJson(realDeps);
      triggerDownload(`solo-leveling-export-day-${day}.json`, json);
      await markExported(day, realDeps);
      await refresh();
    } finally {
      setExporting(false);
    }
  }

  async function handleSeal() {
    setSealing(true);
    setError(null);
    try {
      const rankBefore = await getCurrentRank();
      const result = await sealCheckpoint(day, today, DEFAULT_CONFIG, realDeps);
      const rankAdvanced = result.rank === result.targetRank && result.rank !== rankBefore;
      const comparison = await getCheckpointComparison(day, today, DEFAULT_CONFIG);
      const pending: PendingCheckpointMoment | null = comparison.improved
        ? { rows: comparison.rows, conditions: result.conditions, verdictText: verdictTextFor(result) }
        : null;

      // Both are real, distinct Moments (final/05 §2.1's own weights:
      // RANK ADVANCED full-screen 1100ms, CHECKPOINT a self-paced
      // sequence) — when a seal earns both, RANK ADVANCED plays first and
      // CHECKPOINT follows on its dismiss, rather than stacking overlays.
      if (rankAdvanced) {
        setRankAdvance({ from: rankBefore, to: result.rank, next: pending });
      } else if (pending) {
        setCheckpointMoment({ rankBefore, rankAfter: result.rank, ...pending });
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not seal.');
    } finally {
      setSealing(false);
    }
  }

  if (!report) return null;
  const sealed = report.checkpoint?.sealed_at !== undefined;
  const exported = report.checkpoint?.export_verified === true;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg p-4" data-testid="checkpoint-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">CHECKPOINT · DAY {day}</h1>
        <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
          ✕
        </button>
      </div>

      <p className="mt-2 text-sm font-medium text-text" data-testid="checkpoint-verdict">
        {report.verdictText}
      </p>

      <div className="mt-3 space-y-1">
        {report.result.conditions.map((c, i) => (
          <p key={i} className={`text-xs ${c.met ? 'text-text-dim' : 'text-text-faint'}`}>
            {c.met ? '✓' : '✗'} {c.label}
          </p>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-state-alert">{error}</p>}

      {sealed ? (
        <p className="mt-4 text-sm text-accent">Sealed. Rank {report.checkpoint?.rank_after}.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {!exported && <p className="text-xs text-text-faint">⚠ Export required to seal.</p>}
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="min-h-[44px] w-full rounded-md border border-border text-sm text-text disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : exported ? 'Export again' : 'Export'}
          </button>
          <button
            type="button"
            disabled={!exported || sealing}
            onClick={() => void handleSeal()}
            className="min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            {sealing ? 'Sealing…' : 'Seal checkpoint'}
          </button>
        </div>
      )}

      {rankAdvance && (
        <RankAdvancedMoment
          fromRank={rankAdvance.from}
          toRank={rankAdvance.to}
          onDismiss={() => {
            const next = rankAdvance.next;
            setRankAdvance(null);
            if (next) setCheckpointMoment({ rankBefore: rankAdvance.from, rankAfter: rankAdvance.to, ...next });
          }}
        />
      )}

      {checkpointMoment && (
        <CheckpointMoment
          day={day}
          rankBefore={checkpointMoment.rankBefore}
          rankAfter={checkpointMoment.rankAfter}
          rows={checkpointMoment.rows}
          conditions={checkpointMoment.conditions}
          verdictText={checkpointMoment.verdictText}
          onDismiss={() => setCheckpointMoment(null)}
        />
      )}
    </div>
  );
}
