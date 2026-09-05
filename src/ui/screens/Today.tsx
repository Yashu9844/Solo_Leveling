import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { arcDay, isDayClosed, localDate } from '../../engine/time';
import { levelFor, type LevelState } from '../../engine/level';
import type { CoreQuestKey, QuestInstance, QuestRecoveredPayload, QuestTemplate } from '../../engine/types';
import { realDeps } from '../../store/deps';
import { db } from '../../db/db';
import { loadTodayQuests, completeQuest, undoQuest } from '../../store/quests';
import { getDayXpByInstance, getTotalXp } from '../../store/playerState';
import { getStreakState, type LiveStreakState } from '../../store/streak';
import { getRecoverableDay, claimRecovery, type RecoverableDay } from '../../store/recovery';
import { hasReviewedToday } from '../../store/review';
import { QuestRow } from '../today/QuestRow';
import { QuestDetailSheet } from '../today/QuestDetailSheet';
import { priorityLine } from '../today/priorityLine';
import { LevelUpMoment } from '../moments/LevelUpMoment';
import { unlockTextForRange } from '../moments/levelUnlocks';
import { EveningReview } from '../review/EveningReview';
import { LogApplicationSheet } from '../career/LogApplicationSheet';
import { LogProblemSheet } from '../dsa/LogProblemSheet';
import { getRevisitsDue, logRevisit, type RevisitDue } from '../../store/dsa';
import { getCurrentRank } from '../../store/checkpoint';
import { LogBuildSessionSheet } from '../build/LogBuildSessionSheet';
import { LogTrainingSheet } from '../training/LogTrainingSheet';
import { LogSleepSheet } from '../lifestyle/LogSleepSheet';
import { LogAttentionSheet } from '../lifestyle/LogAttentionSheet';
import { MaintenanceCard } from '../lifestyle/MaintenanceCard';
import { LearningBlockSheet } from '../foundations/LearningBlockSheet';
import { SingleChipSelect } from '../components/SingleChipSelect';
import { getTodaySystemLine } from '../../store/messages';
import { recordReflectionShown } from '../../store/reflections';

const CONFIG = DEFAULT_CONFIG;

// final/01 §6.3 — "one optional diagnostic tap, no free text." 3x
// "wrong time" in 14 days feeds engine/rules.ts's WRONG_TIME_PATTERN.
const RECOVERY_REASONS: NonNullable<QuestRecoveredPayload['reason']>[] = [
  'ran_out_of_time',
  'too_tired',
  'wrong_time',
  'didnt_want_to',
];
const RECOVERY_REASON_LABELS: Record<NonNullable<QuestRecoveredPayload['reason']>, string> = {
  ran_out_of_time: 'Ran out of time',
  too_tired: 'Too tired',
  wrong_time: 'Wrong time',
  didnt_want_to: "Didn't want to",
};

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
  const [streak, setStreak] = useState<LiveStreakState | null>(null);
  const [recoverable, setRecoverable] = useState<RecoverableDay | null>(null);
  const [claimingRecovery, setClaimingRecovery] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState<NonNullable<QuestRecoveredPayload['reason']> | null>(null);
  const [reviewed, setReviewed] = useState(true); // true until refresh() proves otherwise — hides the entry on first paint
  const [reviewOpen, setReviewOpen] = useState(false);
  const [careerLogOpen, setCareerLogOpen] = useState(false);
  const [dsaLogOpen, setDsaLogOpen] = useState(false);
  const [buildLogOpen, setBuildLogOpen] = useState(false);
  const [trainingLogOpen, setTrainingLogOpen] = useState(false);
  const [sleepLogOpen, setSleepLogOpen] = useState(false);
  const [attentionLogOpen, setAttentionLogOpen] = useState(false);
  const [learningBlockOpen, setLearningBlockOpen] = useState(false);
  const [revisitsDue, setRevisitsDue] = useState<RevisitDue[]>([]);
  const [rank, setRank] = useState('E');
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [revisitingId, setRevisitingId] = useState<string | null>(null);
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

    const [streakState, recoverableDay, alreadyReviewed, dueRevisits, currentRank] = await Promise.all([
      getStreakState(date, CONFIG),
      getRecoverableDay(date, CONFIG),
      hasReviewedToday(date),
      getRevisitsDue(date, CONFIG),
      getCurrentRank(),
    ]);
    setStreak(streakState);
    setRecoverable(recoverableDay);
    setReviewed(alreadyReviewed);
    setRevisitsDue(dueRevisits);
    setRank(currentRank);

    // final/06 §5.2's "reflection" line, right below the priority line.
    // A missed day surfacing a recovery card IS the post-lapse moment
    // final/05 §1.2 means — the reflection pool narrows to setbacks/
    // calm/reflective for exactly as long as that card is showing.
    const line = await getTodaySystemLine(date, arcDay(realDeps.now(), arcRow.start_date, arcRow.timezone, arcRow.day_boundary_hour), recoverableDay !== null, recoverableDay !== null ? 'POST_LAPSE' : 'MORNING', CONFIG);
    setSystemLine(line.text);
    if (line.source === 'reflection' && line.reflectionId) {
      await recordReflectionShown(line.reflectionId, date);
    }
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

  async function handleClaimRecovery() {
    if (!arc || !recoverable || claimingRecovery) return;
    setClaimingRecovery(true);
    try {
      await claimRecovery(recoverable.localDate, today, arc.id, CONFIG, realDeps, recoveryReason ?? undefined);
      setRecoverable(null);
      setRecoveryReason(null);
      await refreshXp(today);
    } catch {
      setNotice('Could not save — try again.');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setClaimingRecovery(false);
    }
  }

  async function handleLogRevisit(problemId: string, outcome: 'first_attempt' | 'hint' | 'editorial' | 'unsolved') {
    if (!arc || revisitingId) return;
    setRevisitingId(problemId);
    try {
      await logRevisit(today, arc.id, problemId, outcome, 10, CONFIG, realDeps);
      setRevisitsDue((prev) => prev.filter((r) => r.problemId !== problemId));
      await refreshXp(today);
    } catch {
      setNotice('Could not save — try again.');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setRevisitingId(null);
    }
  }

  function domainLogFor(key: CoreQuestKey, closeSheet: () => void): { label: string; onOpen: () => void } | undefined {
    function open(setter: (v: boolean) => void) {
      closeSheet();
      setter(true);
    }
    switch (key) {
      case 'career':
        return { label: 'Log application', onOpen: () => open(setCareerLogOpen) };
      case 'dsa':
        return { label: 'Log problem', onOpen: () => open(setDsaLogOpen) };
      case 'build':
        return { label: 'Log session', onOpen: () => open(setBuildLogOpen) };
      case 'training':
        return { label: 'Log training', onOpen: () => open(setTrainingLogOpen) };
      case 'sleep':
        return { label: 'Log wake time', onOpen: () => open(setSleepLogOpen) };
      case 'attention':
        return { label: 'Log screen time', onOpen: () => open(setAttentionLogOpen) };
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
        {day != null ? `DAY ${day} · ` : ''}LEVEL {levelState.level} · RANK {rank}
      </div>
      <div className="mb-1 h-1 w-full overflow-hidden rounded-pill bg-surface-2">
        <div
          className="h-full rounded-pill bg-accent transition-all duration-500"
          style={{ width: `${barPct}%` }}
          data-testid="xp-bar-fill"
        />
      </div>

      {/* Streak is displayed smaller than consistency — it's the number
          that carries the real signal (final/01 §6.2). */}
      {streak && (streak.consistency_7 > 0 || streak.consistency_28 > 0 || streak.arc_streak > 0) && (
        <p className="mb-3 text-xxs text-text-faint">
          {streak.consistency_7}% (7d) · {streak.consistency_28}% (28d) · streak {streak.arc_streak}
        </p>
      )}

      {banner && (
        <p className="mb-3 border-l-2 border-accent pl-2 text-sm text-text-dim">
          LEVEL {String(banner.fromLevel).padStart(2, '0')} → {String(banner.toLevel).padStart(2, '0')}
        </p>
      )}

      {streak?.reduced_mode && (
        <p className="mb-3 border-l-2 border-state-recover pl-2 text-sm text-text-dim">
          Reduced to the floor for two days. The arc continues.
        </p>
      )}

      {recoverable && (
        <div className="mb-3 rounded-md border border-border p-3" data-testid="recovery-card">
          <p className="text-sm text-text">
            Yesterday: {recoverable.coreCompleted} of {recoverable.coreTotal}.{' '}
            {recoverable.missedTitles.join(' and ')} incomplete.
          </p>
          <p className="mt-1 text-xs text-text-faint">
            Worth less than what you'd have earned — recovering is never better than not missing.
          </p>
          <div className="mt-2">
            <SingleChipSelect
              label="What got in the way? (optional)"
              options={RECOVERY_REASONS}
              labelFor={(r) => RECOVERY_REASON_LABELS[r]}
              selected={recoveryReason}
              onSelect={setRecoveryReason}
            />
          </div>
          <button
            type="button"
            disabled={claimingRecovery}
            onClick={() => void handleClaimRecovery()}
            className="mt-2 min-h-[44px] w-full rounded-md border border-accent text-sm text-accent disabled:opacity-40"
          >
            Recovery quest · +{CONFIG.recoveryXp} XP
          </button>
        </div>
      )}

      {dayClosed && (
        <p className="mb-3 border-l-2 border-state-recover pl-2 text-sm text-text-dim">
          Day closed. Next day begins at 04:00.
        </p>
      )}

      <p className="mb-1 border-l-2 border-accent pl-2 text-sm text-text-dim">
        {priorityLine(templates, instances, today, arc)}
      </p>

      {systemLine && (
        <p className="mb-4 pl-2 text-xs italic text-text-faint" data-testid="system-line">
          {systemLine}
        </p>
      )}

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

      {arc && (
        <MaintenanceCard today={today} arcId={arc.id} arcStartDate={arc.start_date} onChanged={() => void refreshXp(today)} />
      )}

      {/* final/03 §3 — LEARN is "not a seventh core quest," so its entry
          point isn't a QuestRow; it's always available, any time. */}
      <button
        type="button"
        onClick={() => setLearningBlockOpen(true)}
        className="mt-3 min-h-[44px] w-full rounded-md border border-border text-sm text-text-dim"
      >
        Learning block · +{CONFIG.learningBlockXp} XP
      </button>

      {revisitsDue.length > 0 && (
        <div className="mt-4" data-testid="revisits-due">
          <div className="mb-1 text-xxs uppercase tracking-wide text-text-dim">
            Revisits due · +{CONFIG.revisitXp} XP each
          </div>
          {revisitsDue.map((r) => (
            <div key={r.problemId} className="flex items-center justify-between border-b border-border py-2">
              <span className="text-sm text-text">{r.title}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={revisitingId === r.problemId}
                  onClick={() => void handleLogRevisit(r.problemId, 'first_attempt')}
                  className="min-h-[44px] rounded-md border border-accent px-2 text-xs text-accent disabled:opacity-40"
                >
                  Solved
                </button>
                <button
                  type="button"
                  disabled={revisitingId === r.problemId}
                  onClick={() => void handleLogRevisit(r.problemId, 'unsolved')}
                  className="min-h-[44px] rounded-md border border-border px-2 text-xs text-text-dim disabled:opacity-40"
                >
                  Unsolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!reviewed && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="mt-4 min-h-[44px] w-full rounded-md border border-border text-sm text-accent"
        >
          Evening review · 25 seconds
        </button>
      )}

      {notice && <p className="mt-3 text-sm text-text-dim">{notice}</p>}

      {openTemplate && openInstance && (
        <QuestDetailSheet
          template={openTemplate}
          instance={openInstance}
          dayClosed={dayClosed}
          onClose={() => setOpenInstanceId(null)}
          onToggle={() => void handleToggle(openInstance, openTemplate)}
          domainLog={domainLogFor(openTemplate.key, () => setOpenInstanceId(null))}
        />
      )}

      {careerLogOpen && arc && (
        <LogApplicationSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setCareerLogOpen(false);
            void refresh();
          }}
        />
      )}

      {dsaLogOpen && arc && (
        <LogProblemSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setDsaLogOpen(false);
            void refresh();
          }}
        />
      )}

      {buildLogOpen && arc && (
        <LogBuildSessionSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setBuildLogOpen(false);
            void refresh();
          }}
        />
      )}

      {trainingLogOpen && arc && (
        <LogTrainingSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setTrainingLogOpen(false);
            void refresh();
          }}
        />
      )}

      {sleepLogOpen && arc && (
        <LogSleepSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setSleepLogOpen(false);
            void refresh();
          }}
        />
      )}

      {attentionLogOpen && arc && (
        <LogAttentionSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setAttentionLogOpen(false);
            void refresh();
          }}
        />
      )}

      {learningBlockOpen && arc && (
        <LearningBlockSheet
          today={today}
          arcId={arc.id}
          onClose={() => {
            setLearningBlockOpen(false);
            void refresh();
          }}
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

      {reviewOpen && arc && (
        <EveningReview
          today={today}
          day={day}
          arcId={arc.id}
          onClose={() => {
            setReviewOpen(false);
            setReviewed(true);
          }}
        />
      )}
    </div>
  );
}
