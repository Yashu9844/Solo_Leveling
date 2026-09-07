import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GearSix } from '@phosphor-icons/react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { levelFor } from '../../engine/level';
import { arcDay, localDate } from '../../engine/time';
import { applyEvents } from '../../engine/reduce';
import { resetArc } from '../../store/onboarding';
import { realDeps } from '../../store/deps';
import { useArcStatus } from '../../store/ArcStatusContext';
import { getCurrentRank } from '../../store/checkpoint';
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
import { PaperImportCard } from '../components/PaperImportCard';
import { BodyMetricsCard } from '../components/BodyMetricsCard';
import { CheckpointInstrumentsCard } from '../components/CheckpointInstrumentsCard';
import { FramedPanel, MeterBar, Panel, ScreenHeader, SectionLabel, SecondaryButton } from '../kit';

const CHECKPOINT_DAYS: Checkpoint['day'][] = [14, 30, 60, 90, 120];
const ARC_LENGTH_DAYS = 120;

export function Profile() {
  const navigate = useNavigate();
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const arc = await db.arc.toCollection().first();
      if (!arc) return;
      setDay(arcDay(realDeps.now(), arc.start_date, arc.timezone, arc.day_boundary_hour));
    })();
  }, []);

  return (
    <>
      <ScreenHeader
        title="PROFILE"
        right={
          <span className="flex items-center gap-3">
            {day != null && (
              <span className="font-mono text-xs tabular-nums text-faint">
                DAY {day} / {ARC_LENGTH_DAYS}
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate('/profile/settings')}
              aria-label="Settings"
              className="-mr-2 flex min-h-tap min-w-[44px] items-center justify-center text-ink-500"
            >
              <GearSix size={20} aria-hidden />
            </button>
          </span>
        }
      />
      <div className="px-gutter pb-6 pt-4">
        <LevelSummary />
        <CheckpointRow />
        <BossList />
        <AchievementsList />
        <AttributeBars />
        <DayZeroBaselineRow />
        <BodyMetricsCard />
        <ArcPauseControl />
        <BackupCard />
        <PaperImportCard />
        <InstallCard />
        {import.meta.env.DEV && (
          <>
            <DevResetArc />
            <DevVerifyIntegrity />
          </>
        )}
      </div>
    </>
  );
}

/** Real level, real total XP, real rank (the rank as of the most
 * recently sealed checkpoint — final/01 §4: "Level measures effort.
 * Rank measures evidence. They are not convertible."). */
function LevelSummary() {
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [rank, setRank] = useState<string | null>(null);
  const [mainQuest, setMainQuest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getTotalXp(), getCurrentRank(), db.arc.toCollection().first()]).then(
      ([xp, r, arc]) => {
        if (!cancelled) {
          setTotalXp(xp);
          setRank(r);
          setMainQuest(arc?.main_quest_text ?? null);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (totalXp === null || rank === null) return null;
  const level = levelFor(totalXp, DEFAULT_CONFIG);
  const pct = level.xpForNext > 0 ? (level.xpIntoLevel / level.xpForNext) * 100 : 0;

  return (
    <Panel cut="md" bodyClassName="px-5 py-5">
      {/* The main quest opens the identity screen because it is the one
          sentence the whole arc is measured against — onboarding calls
          it "the only thing the app judges you against", and this is the
          screen where you come to ask who you are in this system. */}
      {mainQuest && (
        <>
          <SectionLabel className="mb-2">Main quest</SectionLabel>
          <p className="font-display text-[calc(17px*var(--type-scale))] leading-[1.45] text-ink-100">
            {mainQuest}
          </p>
          <div className="hairline my-5" aria-hidden />
        </>
      )}

      <div className="flex items-end justify-between">
        <span className="flex items-baseline gap-2.5">
          <span className="text-xxs uppercase text-ink-700">LV</span>
          <span className="glow-text font-mono text-xl tabular-nums text-ink-100">
            {level.level}
          </span>
        </span>
        {/* checkpoint.spec asserts getByText(/RANK E/), so the word and
            the letter have to share one element's text content. Nesting
            the letter keeps that true while letting it be set larger. */}
        <span className="text-xxs uppercase text-ink-700">
          RANK{' '}
          <span className="font-display text-title normal-case leading-none text-ink-100">
            {rank}
          </span>
        </span>
      </div>

      <MeterBar pct={pct} height={8} label="XP to next level" className="mt-3" />

      <div className="mt-3 flex items-baseline justify-between font-mono text-xs tabular-nums text-ink-700">
        <span>
          <span className="text-accent-mid">{level.xpIntoLevel.toLocaleString()}</span> /{' '}
          {level.xpForNext.toLocaleString()} to L{level.level + 1}
        </span>
        <span>{level.totalXp.toLocaleString()} total</span>
      </div>
    </Panel>
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

  const due = daysUntil !== null && daysUntil <= 0;

  // The strongest treatment on the screen that is not a Moment.
  // final/01 §4.1 calls the next gate "the app's most important
  // sentence", and a row that looked like every other row was arguing
  // the opposite. The frame is the same one Moments use, at rest.
  return (
    <FramedPanel tone={due ? 'dawn' : 'accent'} className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-4 py-4 text-left"
        style={{ minHeight: 56 }}
      >
        <span className="text-xxs uppercase text-ink-700">The next gate</span>
        <span className="mt-2 block font-display text-lg leading-tight text-ink-100">
          Next checkpoint: Day {nextCheckpointDay}
        </span>
        <span
          className={[
            'mt-1.5 block font-mono text-xs tabular-nums',
            due ? 'text-dawn-bright' : 'text-accent-mid',
          ].join(' ')}
        >
          {daysUntil === null
            ? 'Open the checklist'
            : due
              ? 'Due now — open it'
              : `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away — open the checklist`}
        </span>
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
    </FramedPanel>
  );
}

/**
 * Not a new onboarding step — onboarding is already at its 90-second
 * budget. This is a one-time catch-up for an arc that already exists,
 * shown only while checkpoint(day: 0)'s instruments are empty
 * (final/11-SLICE-2-PROMPT.md Step 1 for self-efficacy; automaticity and
 * enjoyment's exact wording lives in docs/13-day0-baseline.md, which is
 * why final/11 originally deferred them — the wording existed, just in
 * the wrong directory for that slice's brief).
 */
function DayZeroBaselineRow() {
  return (
    <CheckpointInstrumentsCard
      day={0}
      label="Complete Day-0 baseline"
      header={{
        title: 'Baseline.',
        subtitle: 'There is no good or bad answer — this is the number we compare against in December.',
      }}
      saveLabel="Save baseline"
    />
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
    <Panel
      cut="md"
      className="mt-4"
      bodyClassName="px-4 py-4"
      // A paused arc is a state, not a warning, so its edge takes the
      // recovery amber the app already uses for reduced mode — never red.
      style={pausedToday ? { background: 'var(--state-recover)' } : undefined}
    >
      <SectionLabel className="mb-2">Arc pause</SectionLabel>
      {pausedToday ? (
        <>
          <p className="text-sm leading-[1.5] text-ink-300">
            Paused. No quests generate. Zero penalty.
          </p>
          <div className="mt-4">
            <SecondaryButton disabled={busy} onClick={() => void handleResume()}>
              Resume now
            </SecondaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-[1.5] text-ink-500">
            Illness, travel, a work crisis. One tap, up to 7 days.
          </p>
          <div className="mt-4 flex gap-2">
            {[1, 3, 7].map((days) => (
              <SecondaryButton
                key={days}
                disabled={busy}
                onClick={() => void handlePause(days)}
                className="flex-1"
              >
                {days}d
              </SecondaryButton>
            ))}
          </div>
        </>
      )}
    </Panel>
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
    <DevBlock className="mt-8">
      <button
        type="button"
        onClick={handleReset}
        className="cut-sm mt-3 w-full px-4 text-xs font-medium uppercase tracking-button text-state-alert"
        style={{ minHeight: 46, border: '1px solid var(--state-alert)' }}
      >
        Reset arc
      </button>
      <p className="mt-3 text-xs leading-[1.5] text-faint">
        Deletes all events and projections, clears the arc, returns to onboarding.
      </p>
    </DevBlock>
  );
}

/**
 * Quarantine for the two dev-only blocks.
 *
 * They are fenced in --state-alert deliberately, and it is the one use
 * of that colour that is not itself an error: these buttons destroy
 * data, they never ship (import.meta.env.DEV is false in a build), and
 * while they are on screen they must not be mistakable for part of the
 * app. The dashed edge says the same thing a second way, for anyone who
 * cannot separate the two tones.
 */
function DevBlock({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={['cut-sm p-4', className].join(' ')}
      style={{ border: '1px dashed var(--state-alert)' }}
    >
      <div className="text-xxs uppercase tracking-wide text-state-alert">Dev only</div>
      {children}
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
    <DevBlock className="mt-4">
      <button
        type="button"
        disabled={running}
        onClick={() => void handleVerify()}
        className="cut-sm mt-3 w-full px-4 text-xs font-medium uppercase tracking-button text-state-alert disabled:opacity-40"
        style={{ minHeight: 46, border: '1px solid var(--state-alert)' }}
      >
        {running ? 'Verifying…' : 'Verify integrity'}
      </button>
      {report && (
        <div className="mt-3 text-xs text-faint">
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
    </DevBlock>
  );
}
