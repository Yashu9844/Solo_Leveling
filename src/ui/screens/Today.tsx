import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { arcDay, isDayClosed, localDate } from '../../engine/time';
import type { QuestInstance, QuestTemplate } from '../../engine/types';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { loadTodayQuests, completeQuest, undoQuest } from '../../store/quests';
import { QuestRow } from '../today/QuestRow';
import { QuestDetailSheet } from '../today/QuestDetailSheet';
import { priorityLine } from '../today/priorityLine';

const CONFIG = DEFAULT_CONFIG;

function currentLocalDate(): string {
  return localDate(realDeps.now(), CONFIG.arc.timezone, CONFIG.arc.dayBoundaryHour);
}

export function Today() {
  const [arcId, setArcId] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [today, setToday] = useState<string>(currentLocalDate);
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [instances, setInstances] = useState<QuestInstance[]>([]);
  const [openInstanceId, setOpenInstanceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dayClosed = isDayClosed(realDeps.now(), CONFIG);

  const refresh = useCallback(async () => {
    const arc = await db.arc.toCollection().first();
    if (!arc) return;
    setArcId(arc.id);
    setDay(arcDay(realDeps.now(), arc.start_date, arc.timezone, arc.day_boundary_hour));

    const date = currentLocalDate();
    setToday(date);
    const { templates: t, instances: i } = await loadTodayQuests(date, CONFIG, realDeps);
    setTemplates(t);
    setInstances(i);
  }, []);

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
    if (dayClosed || !arcId) return;

    const wasComplete = instance.state === 'complete';
    const optimistic: QuestInstance = {
      ...instance,
      state: wasComplete ? 'available' : 'complete',
      completed_at: wasComplete ? undefined : realDeps.now(),
    };
    setInstances((prev) => prev.map((i) => (i.id === instance.id ? optimistic : i)));

    try {
      if (wasComplete) {
        await undoQuest(instance, arcId, CONFIG, realDeps);
      } else {
        await completeQuest(instance, template.key, arcId, CONFIG, realDeps);
      }
    } catch {
      setInstances((prev) => prev.map((i) => (i.id === instance.id ? instance : i)));
      setNotice('Could not save — try again.');
      setTimeout(() => setNotice(null), 3000);
    }
  }

  const openTemplate = templates.find(
    (t) => t.id === instances.find((i) => i.id === openInstanceId)?.template_id
  );
  const openInstance = instances.find((i) => i.id === openInstanceId);

  return (
    <div className="p-4">
      <div className="mb-4 text-xs uppercase tracking-wide text-text-dim">
        {day != null ? `DAY ${day} · ` : ''}LEVEL 1 · RANK E
      </div>

      {dayClosed && (
        <p className="mb-3 border-l-2 border-state-recover pl-2 text-sm text-text-dim">
          Day closed. Next day begins at 04:00.
        </p>
      )}

      <p className="mb-4 border-l-2 border-accent pl-2 text-sm text-text-dim">
        {priorityLine(templates, instances)}
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
    </div>
  );
}
