import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_CONFIG } from '../../engine/config';
import { levelFor } from '../../engine/level';
import { arcDay, localDate } from '../../engine/time';
import { applyEvents } from '../../engine/reduce';
import { resetArc } from '../../store/onboarding';
import { realDeps } from '../../store/deps';
import { useArcStatus } from '../../store/ArcStatusContext';
import { getDayZeroCheckpoint, saveSelfEfficacy, selfEfficacyIsComplete, getCurrentRank } from '../../store/checkpoint';
import type { Checkpoint } from '../../engine/rank';
import { getTotalXp } from '../../store/playerState';
import { pauseArc, resumeArc } from '../../store/pause';
import { db } from '../../db/db';
import { getAllEvents } from '../../db/events';
import { verifyIntegrity, type IntegrityReport } from '../../db/projections';
import { AttributeBars } from '../components/AttributeBars';
import { CheckpointScreen } from '../checkpoint/CheckpointScreen';
import { BossList } from '../components/BossList';
import { AchievementsList } from '../components/AchievementsList';
import { InstallCard } from '../components/InstallCard';
import { BackupCard } from '../components/BackupCard';

const CHECKPOINT_DAYS: Checkpoint['day'][] = [14, 30, 60, 90, 120];

export function Profile() {
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">PROFILE</h1>
      <LevelSummary />
      <CheckpointRow />
      <BossList />
      <AchievementsList />
      <AttributeBars />
      <DayZeroBaselineRow />
      <ArcPauseControl />
      <BackupCard />
      <InstallCard />
      {import.meta.env.DEV && (
        <>
          <DevResetArc />
          <DevVerifyIntegrity />
        </>
      )}
    </div>
  );
}

/** Real level, real total XP, real rank (the rank as of the most
 * recently sealed checkpoint — final/01 §4: "Level measures effort.
 * Rank measures evidence. They are not convertible."). */
function LevelSummary() {
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [rank, setRank] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getTotalXp(), getCurrentRank()]).then(([xp, r]) => {
      if (!cancelled) {
        setTotalXp(xp);
        setRank(r);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (totalXp === null || rank === null) return null;
  const level = levelFor(totalXp, DEFAULT_CONFIG);

  return (
    <p className="mt-2 font-mono text-sm tabular-nums text-text-dim">
      LEVEL {level.level} · {level.xpIntoLevel.toLocaleString()} / {level.xpForNext.toLocaleString()} to L
      {level.level + 1} · total XP {level.totalXp.toLocaleString()} · RANK {rank}
    </p>
  );
}

/** final/01 §4.1 — "The Profile screen always shows the next gate as a
 * ✓/✗ checklist. This is the app's most important sentence." */
function CheckpointRow() {
  const [day, setDay] = useState<number | null>(null);
  const [nextCheckpointDay, setNextCheckpointDay] = useState<Checkpoint['day'] | null>(null);
  const [open, setOpen] = useState(false);
  const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);

  const refresh = useCallback(async () => {
    const arc = await db.arc.toCollection().first();
    if (!arc) return;
    setDay(arcDay(realDeps.now(), arc.start_date, arc.timezone, arc.day_boundary_hour));

    const sealedDays = new Set(
      (await db.checkpoint.toArray()).filter((c) => c.sealed_at !== undefined).map((c) => c.day)
    );
    const next = CHECKPOINT_DAYS.find((d) => !sealedDays.has(d)) ?? null;
    setNextCheckpointDay(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (nextCheckpointDay === null) return null;
  const daysUntil = day !== null ? nextCheckpointDay - day : null;

  return (
    <div className="mt-3 rounded-md border border-border p-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full text-left text-sm text-accent"
      >
        Next checkpoint: Day {nextCheckpointDay}
        {daysUntil !== null && daysUntil > 0 ? ` (${daysUntil}d)` : daysUntil !== null ? ' — due' : ''}
      </button>
      {open && (
        <CheckpointScreen
          day={nextCheckpointDay}
          today={today}
          onClose={() => {
            setOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

const SELF_EFFICACY_QUESTIONS = [
  'Solve an unseen medium DSA problem in 25 minutes, in front of an interviewer?',
  "Explain your last project's architecture to a senior engineer for 10 minutes?",
  'Design an evaluation suite for an agent from a blank file?',
  "Complete your planned training session on a day you don't feel like it?",
  'Hold your wake time within 30 minutes for the next 14 days?',
  'Apply to 5 roles above your current level this week?',
] as const;

/**
 * Not a new onboarding step — onboarding is already at its 90-second
 * budget. This is a one-time catch-up for an arc that already exists,
 * shown only while checkpoint(day: 0).self_efficacy is empty
 * (final/11-SLICE-2-PROMPT.md Step 1).
 */
function DayZeroBaselineRow() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<number[]>([50, 50, 50, 50, 50, 50]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDayZeroCheckpoint().then((checkpoint) => {
      if (!cancelled) {
        setVisible(!selfEfficacyIsComplete(checkpoint));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function handleSave() {
    setSaving(true);
    const items = values as [number, number, number, number, number, number];
    await saveSelfEfficacy(items);
    setSaving(false);
    setVisible(false);
  }

  return (
    <div className="mt-6 rounded-md border border-border p-3">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="min-h-[44px] w-full text-left text-sm text-accent"
        >
          Complete Day-0 baseline
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-md text-text">Baseline.</div>
            <p className="text-sm text-text-dim">
              There is no good or bad answer — this is the number we compare against in December.
            </p>
          </div>
          <p className="text-xs text-text-faint">How confident are you, right now, that you could:</p>
          {SELF_EFFICACY_QUESTIONS.map((question, idx) => (
            <label key={question} className="block">
              <span className="text-sm text-text">
                {idx + 1}. {question}
              </span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={values[idx]}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, i) => (i === idx ? Number(e.target.value) : v)))
                  }
                  className="flex-1"
                />
                <span className="w-10 text-right font-mono text-sm tabular-nums text-text">
                  {values[idx]}
                </span>
              </div>
            </label>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            Save baseline
          </button>
        </div>
      )}
    </div>
  );
}

/** One tap, up to 7 days. No quests generate, streak preserved, end date
 * shifts. Zero penalty. final/01 §6.5. */
function ArcPauseControl() {
  const [arcId, setArcId] = useState<string | null>(null);
  const [pausedToday, setPausedToday] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);

  const refresh = useCallback(async () => {
    const arc = await db.arc.toCollection().first();
    if (!arc) return;
    setArcId(arc.id);
    const events = await getAllEvents();
    const state = applyEvents(events, DEFAULT_CONFIG);
    setPausedToday(state.arc?.paused_dates.includes(today) ?? false);
  }, [today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handlePause(days: number) {
    if (!arcId || busy) return;
    setBusy(true);
    await pauseArc(today, days, arcId, DEFAULT_CONFIG, realDeps);
    await refresh();
    setBusy(false);
  }

  async function handleResume() {
    if (!arcId || busy) return;
    setBusy(true);
    await resumeArc(today, arcId, DEFAULT_CONFIG, realDeps);
    await refresh();
    setBusy(false);
  }

  if (arcId === null) return null;

  return (
    <div className="mt-6 rounded-md border border-border p-3">
      <div className="text-xxs uppercase tracking-wide text-text-dim">Arc pause</div>
      {pausedToday ? (
        <>
          <p className="mt-1 text-sm text-text-dim">Paused. No quests generate. Zero penalty.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResume()}
            className="mt-2 min-h-[44px] w-full rounded-md border border-border text-sm text-text disabled:opacity-40"
          >
            Resume now
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-text-dim">Illness, travel, a work crisis. One tap, up to 7 days.</p>
          <div className="mt-2 flex gap-2">
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                type="button"
                disabled={busy}
                onClick={() => void handlePause(days)}
                className="min-h-[44px] flex-1 rounded-md border border-border text-sm text-text disabled:opacity-40"
              >
                {days}d
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * DEV-only. Deletes all events and projections, clears the arc, and
 * returns to /onboarding — for re-running onboarding while stopwatching
 * it, without uninstalling the PWA each time. Never renders in production:
 * `import.meta.env.DEV` is false in a built app.
 */
function DevResetArc() {
  const navigate = useNavigate();
  const { markArcReset } = useArcStatus();

  async function handleReset() {
    await resetArc();
    markArcReset();
    navigate('/onboarding', { replace: true });
  }

  return (
    <div className="mt-8 rounded-md border border-state-alert p-3">
      <div className="text-xxs uppercase tracking-wide text-state-alert">Dev only</div>
      <button
        type="button"
        onClick={handleReset}
        className="mt-2 min-h-[44px] w-full rounded-md border border-state-alert text-sm text-state-alert"
      >
        Reset arc
      </button>
      <p className="mt-2 text-xs text-text-faint">
        Deletes all events and projections, clears the arc, returns to onboarding.
      </p>
    </div>
  );
}

/**
 * DEV-only. Runs verifyIntegrity() (db/projections.ts) and prints the
 * report — rebuilds quest_template/quest_instance/xp_ledger from the
 * event log in memory and diffs against the live tables, without writing
 * anything.
 */
function DevVerifyIntegrity() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [running, setRunning] = useState(false);

  async function handleVerify() {
    setRunning(true);
    const result = await verifyIntegrity(DEFAULT_CONFIG, realDeps);
    setReport(result);
    setRunning(false);
  }

  return (
    <div className="mt-4 rounded-md border border-state-alert p-3">
      <div className="text-xxs uppercase tracking-wide text-state-alert">Dev only</div>
      <button
        type="button"
        disabled={running}
        onClick={() => void handleVerify()}
        className="mt-2 min-h-[44px] w-full rounded-md border border-state-alert text-sm text-state-alert disabled:opacity-40"
      >
        {running ? 'Verifying…' : 'Verify integrity'}
      </button>
      {report && (
        <div className="mt-2 text-xs text-text-faint">
          {report.clean ? (
            <p>Clean — rebuild matches the live tables exactly.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {report.discrepancies.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
