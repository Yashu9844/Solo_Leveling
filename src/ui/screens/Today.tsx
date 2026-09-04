import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { arcDay, isDayClosed, localDate } from '../../engine/time';
import { levelFor, type LevelState } from '../../engine/level';
import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { loadTodayQuests, completeQuest, undoQuest } from '../../store/quests';
import { getDayXpByInstance, getTotalXp } from '../../store/playerState';
import { QuestRow } from '../today/QuestRow';
import { QuestDetailSheet } from '../today/QuestDetailSheet';
import { priorityLine } from '../today/priorityLine';
import { LevelUpMoment } from '../moments/LevelUpMoment';
import { unlockTextForRange } from '../moments/levelUnlocks';

const CONFIG = DEFAULT_CONFIG;

function currentLocalDate(): string {
  return localDate(realDeps.now(), CONFIG.arc.timezone, CONFIG.arc.dayBoundaryHour);
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

interface Arc {
  id: string;
  start_date: string;
  end_date: string;
}

interface LevelUpEvent {
  fromLevel: number;
  toLevel: number;
}

// LEVEL UP is full-screen for its first 3 occurrences in the arc; from
// the 4th on it degrades to an inline banner (final/05 §2.3). Reaching
// level L means exactly L-1 level-up transitions have happened, so this
// needs no separate counter — the level number IS the occurrence count.
const FULL_SCREEN_LEVEL_UP_LIMIT = 3;

export function Today() {
  const [arc, setArc] = useState<Arc | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [today, setToday] = useState<string>(currentLocalDate);
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [instances, setInstances] = useState<QuestInstance[]>([]);
  const [dayXp, setDayXp] = useState<Record<string, { amount: number; cappedFrom?: number }>>({});
  const [levelState, setLevelState] = useState<LevelState>(() => levelFor(0, CONFIG));
  const [openInstanceId, setOpenInstanceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [moment, setMoment] = useState<LevelUpEvent | null>(null);
  const [banner, setBanner] = useState<LevelUpEvent | null>(null);
  const dayClosed = isDayClosed(realDeps.now(), CONFIG);

  const refreshXp = useCallback(async (date: string) => {
    const [totalXp, xpByInstance] = await Promise.all([getTotalXp(), getDayXpByInstance(date)]);
    setLevelState(levelFor(totalXp, CONFIG));
    setDayXp(xpByInstance);
  }, []);

  const refresh = useCallback(async () => {
    const arcRow = await db.arc.toCollection().first();
    if (!arcRow) return;
    setArc({ id: arcRow.id, start_date: arcRow.start_date, end_date: arcRow.end_date });
    setDay(arcDay(realDeps.now(), arcRow.start_date, arcRow.timezone, arcRow.day_boundary_hour));

    const date = currentLocalDate();
    setToday(date);
    const { templates: t, instances: i } = await loadTodayQuests(date, CONFIG, realDeps);
    setTemplates(t);
    setInstances(i);
    await refreshXp(date);
  }, [refreshXp]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // You leave this app open overnight — a stale date after the 04:00
  // rollover is a real bug, not a hypothetical (final/11 Step 3).
  useEffect(() => {
    function onVisibleOrFocus() {
      const date = currentLocalDate();
      if (date !== today) {
        void refresh();
      }
    }
    document.addEventListener('visibilitychange', onVisibleOrFocus);
    window.addEventListener('focus', onVisibleOrFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener('focus', onVisibleOrFocus);
    };
  }, [today, refresh]);

  async function handleToggle(instance: QuestInstance, template: QuestTemplate) {
    if (dayClosed || !arc) return;

    const wasComplete = instance.state === 'complete';
    const optimistic: QuestInstance = {
      ...instance,
      state: wasComplete ? 'available' : 'complete',
      completed_at: wasComplete ? undefined : realDeps.now(),
    };
    setInstances((prev) => prev.map((i) => (i.id === instance.id ? optimistic : i)));
    // Optimistic XP feedback — the visible number before the write
    // confirms, so a tap reads as instant. Corrected to the real (maybe
    // capped) amount once refreshXp resolves. final/12 Step 4: under
    // 300ms, offline.
    if (!wasComplete) {
      setDayXp((prev) => ({ ...prev, [instance.id]: { amount: template.xp } }));
    } else {
      setDayXp((prev) => omitKey(prev, instance.id));
    }

    const beforeLevel = levelState.level;

    try {
      if (wasComplete) {
        await undoQuest(instance, arc.id, CONFIG, realDeps);
      } else {
        await completeQuest(instance, template.key, arc.id, CONFIG, realDeps);
      }
      await refreshXp(today);

      if (!wasComplete) {
        const afterXp = await getTotalXp();
        const afterLevel = levelFor(afterXp, CONFIG).level;
        if (afterLevel > beforeLevel) {
          const event: LevelUpEvent = { fromLevel: beforeLevel, toLevel: afterLevel };
          if (afterLevel - 1 <= FULL_SCREEN_LEVEL_UP_LIMIT) {
            setMoment(event);
          } else {
            setBanner(event);
            setTimeout(() => setBanner(null), 6000);
          }
        }
      }
    } catch {
      setInstances((prev) => prev.map((i) => (i.id === instance.id ? instance : i)));
      setDayXp((prev) => omitKey(prev, instance.id));
      setNotice('Could not save — try again.');
      setTimeout(() => setNotice(null), 3000);
    }
  }

  const openTemplate = templates.find(
    (t) => t.id === instances.find((i) => i.id === openInstanceId)?.template_id
  );
  const openInstance = instances.find((i) => i.id === openInstanceId);
  const barPct =
    levelState.xpForNext > 0 ? Math.min(100, (levelState.xpIntoLevel / levelState.xpForNext) * 100) : 0;

  return (
    <div className="p-4">
      <div className="mb-1 text-xs uppercase tracking-wide text-text-dim">
        {day != null ? `DAY ${day} · ` : ''}LEVEL {levelState.level} · RANK E
      </div>
      <div className="mb-4 h-1 w-full overflow-hidden rounded-pill bg-surface-2">
        <div
          className="h-full rounded-pill bg-accent transition-all duration-500"
          style={{ width: `${barPct}%` }}
          data-testid="xp-bar-fill"
        />
      </div>

      {banner && (
        <p className="mb-3 border-l-2 border-accent pl-2 text-sm text-text-dim">
          LEVEL {String(banner.fromLevel).padStart(2, '0')} → {String(banner.toLevel).padStart(2, '0')}
        </p>
      )}

      {dayClosed && (
        <p className="mb-3 border-l-2 border-state-recover pl-2 text-sm text-text-dim">
          Day closed. Next day begins at 04:00.
        </p>
      )}

      <p className="mb-4 border-l-2 border-accent pl-2 text-sm text-text-dim">
        {priorityLine(templates, instances, today, arc)}
      </p>

      <h1 className="sr-only">TODAY</h1>

      <div>
        {templates.map((template) => {
          const instance = instances.find((i) => i.template_id === template.id);
          if (!instance) return null;
          return (
            <QuestRow
              key={template.id}
              template={template}
              instance={instance}
              dayClosed={dayClosed}
              xp={dayXp[instance.id]}
              onToggle={() => void handleToggle(instance, template)}
              onOpen={() => setOpenInstanceId(instance.id)}
            />
          );
        })}
      </div>

      {notice && <p className="mt-3 text-sm text-text-dim">{notice}</p>}

      {openTemplate && openInstance && (
        <QuestDetailSheet
          template={openTemplate}
          instance={openInstance}
          dayClosed={dayClosed}
          onClose={() => setOpenInstanceId(null)}
          onToggle={() => void handleToggle(openInstance, openTemplate)}
        />
      )}

      {moment && (
        <LevelUpMoment
          fromLevel={moment.fromLevel}
          toLevel={moment.toLevel}
          unlockText={unlockTextForRange(moment.fromLevel, moment.toLevel)}
          onDismiss={() => setMoment(null)}
        />
      )}
    </div>
  );
}
