import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { getBossStatus, clearBoss } from '../../store/boss';
import type { BossId, BossResult } from '../../engine/boss';
import { BOSSES } from '../../engine/boss';
import { BossClearedMoment } from '../moments/BossClearedMoment';

/** final/01 §7 — "Announced 7 days ahead with a live checklist. Cannot
 * be failed; a missed window reopens at the next checkpoint." The
 * 7-days-ahead announcement timing isn't modelled (it would need a
 * scheduled-notification system this build doesn't have) — every boss
 * is just listed here from the day its window opens. */
export function BossList() {
  const [statuses, setStatuses] = useState<BossResult[] | null>(null);
  const [clearingId, setClearingId] = useState<BossId | null>(null);
  const [clearedMoment, setClearedMoment] = useState<{ id: BossId; title: string } | null>(null);
  const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);

  async function refresh() {
    const results = await Promise.all(BOSSES.map((b) => getBossStatus(b.id, today)));
    setStatuses(results);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  async function handleClear(bossId: BossId) {
    const arc = await db.arc.toCollection().first();
    if (!arc || clearingId) return;
    setClearingId(bossId);
    try {
      const result = await clearBoss(bossId, arc.id, today, DEFAULT_CONFIG, realDeps);
      if (result.cleared) setClearedMoment({ id: bossId, title: result.boss.title });
      await refresh();
    } finally {
      setClearingId(null);
    }
  }

  const visible = (statuses ?? []).filter((s) => s.windowOpen || s.cleared);
  if (visible.length === 0) return null;

  return (
    <div className="mt-3" data-testid="boss-list">
      <div className="mb-1 text-xxs uppercase tracking-wide text-text-faint">Bosses</div>
      {visible.map((status) => {
        const metCount = status.conditions.filter((c) => c.met).length;
        return (
          <div key={status.boss.id} className="mb-2 rounded-md border border-border p-3">
            <p className="text-sm text-text">
              {status.cleared ? '✓ ' : ''}BOSS {status.boss.id} · {status.boss.title}
            </p>
            <p className="text-xs text-text-faint">
              Days {status.boss.windowStartDay}-{status.boss.windowEndDay} · {metCount} of {status.conditions.length} met
            </p>
            {!status.cleared && (
              <button
                type="button"
                disabled={metCount < status.conditions.length || clearingId === status.boss.id}
                onClick={() => void handleClear(status.boss.id)}
                className="mt-2 min-h-[44px] w-full rounded-md border border-accent text-sm text-accent disabled:opacity-40"
              >
                {clearingId === status.boss.id ? 'Clearing…' : `Clear boss · +${DEFAULT_CONFIG.bossXp} XP`}
              </button>
            )}
          </div>
        );
      })}
      {clearedMoment && (
        <BossClearedMoment bossId={clearedMoment.id} bossTitle={clearedMoment.title} onDismiss={() => setClearedMoment(null)} />
      )}
    </div>
  );
}
