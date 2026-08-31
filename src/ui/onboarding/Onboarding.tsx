import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_CONFIG } from '../../engine/config';
import type { ImplementationIntention } from '../../engine/types';
import { initialiseArc, type OnboardingInput } from '../../store/onboarding';
import { realDeps } from '../../store/deps';
import { useArcStatus } from '../../store/ArcStatusContext';
import { ChipToggle } from '../components/ChipToggle';
import { Stepper } from '../components/Stepper';

const TRAINING_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const ATTENTION_APP_OPTIONS = ['Instagram', 'YouTube', 'X / Twitter', 'Reddit', 'TikTok'] as const;

interface IntentionDraft {
  time: string;
  place: string;
  first_action: string;
}

interface FormState {
  name: string;
  startDate: string;
  endDate: string;
  wakeTime: string;
  sleepTime: string;
  trainingDays: string[];
  stepsTarget: number;
  screenCapMinutes: number;
  attentionApps: string[];
  mainQuestText: string;
  career: IntentionDraft;
  dsa: IntentionDraft;
  training: IntentionDraft;
  heightCm: string;
  weightKg: string;
  problemsSolvedSoFar: string;
}

function initialForm(): FormState {
  return {
    name: '',
    startDate: DEFAULT_CONFIG.arc.startDate,
    endDate: DEFAULT_CONFIG.arc.endDate,
    wakeTime: '08:30',
    sleepTime: '02:00',
    trainingDays: [],
    stepsTarget: 8000,
    screenCapMinutes: 60,
    attentionApps: [],
    mainQuestText: '',
    career: { time: '08:35', place: '', first_action: '' },
    dsa: { time: '22:00', place: '', first_action: '' },
    training: { time: '20:15', place: '', first_action: '' },
    heightCm: '178',
    weightKg: '72',
    problemsSolvedSoFar: '',
  };
}

function dayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

function alarmLabel(intention: IntentionDraft, questTitle: string): string {
  const action = intention.first_action.trim() || '…';
  return `${intention.time} — ${questTitle}. ${action}.`;
}

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { markArcCreated } = useArcStatus();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateIntention(key: 'career' | 'dsa' | 'training', patch: Partial<IntentionDraft>) {
    setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
  }

  const canProceed =
    step === 1
      ? form.name.trim().length > 0
      : step === 4
        ? form.mainQuestText.trim().length > 0
        : step === 5
          ? [form.career, form.dsa, form.training].every(
              (i) => i.place.trim().length > 0 && i.first_action.trim().length > 0
            )
          : true;

  async function handleInitialise() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const toIntention = (i: IntentionDraft): ImplementationIntention => ({
      time: i.time,
      place: i.place.trim(),
      first_action: i.first_action.trim(),
    });

    const input: OnboardingInput = {
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      timezone: DEFAULT_CONFIG.arc.timezone,
      dayBoundaryHour: DEFAULT_CONFIG.arc.dayBoundaryHour,
      dayCloseHour: DEFAULT_CONFIG.arc.dayCloseHour,
      wakeTime: form.wakeTime,
      sleepTime: form.sleepTime,
      trainingDays: form.trainingDays,
      stepsTarget: form.stepsTarget,
      screenCapMinutes: form.screenCapMinutes,
      attentionApps: form.attentionApps,
      mainQuestText: form.mainQuestText.trim(),
      intentions: {
        career: toIntention(form.career),
        dsa: toIntention(form.dsa),
        training: toIntention(form.training),
      },
      baseline: {
        heightCm: form.heightCm.trim() ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg.trim() ? Number(form.weightKg) : undefined,
        // bodyFatPct intentionally omitted — never collected, never estimated.
        problemsSolvedSoFar: form.problemsSolvedSoFar.trim()
          ? Number(form.problemsSolvedSoFar)
          : undefined,
      },
    };

    try {
      await initialiseArc(input, DEFAULT_CONFIG, realDeps);
      markArcCreated();
      onComplete();
      navigate('/today', { replace: true });
    } catch {
      setError('Could not save — try again.');
      setIsSubmitting(false);
    }
  }

  async function handleCopyTimes() {
    const text = [
      alarmLabel(form.career, 'CAREER'),
      alarmLabel(form.dsa, 'DSA'),
      '23:30 — Evening review. 25 seconds.',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the times are on screen either way.
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg p-4 text-text">
      <div className="mb-4 text-xxs uppercase tracking-wide text-text-dim">{step}/6</div>
      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <Step1Framing name={form.name} onChangeName={(v) => update('name', v)} />
        )}
        {step === 2 && (
          <Step2Arc
            startDate={form.startDate}
            endDate={form.endDate}
            onChangeStart={(v) => update('startDate', v)}
            onChangeEnd={(v) => update('endDate', v)}
          />
        )}
        {step === 3 && (
          <Step3Rhythm
            wakeTime={form.wakeTime}
            sleepTime={form.sleepTime}
            trainingDays={form.trainingDays}
            stepsTarget={form.stepsTarget}
            screenCapMinutes={form.screenCapMinutes}
            attentionApps={form.attentionApps}
            onChangeWake={(v) => update('wakeTime', v)}
            onChangeSleep={(v) => update('sleepTime', v)}
            onChangeTrainingDays={(v) => update('trainingDays', v)}
            onChangeStepsTarget={(v) => update('stepsTarget', v)}
            onChangeScreenCap={(v) => update('screenCapMinutes', v)}
            onChangeAttentionApps={(v) => update('attentionApps', v)}
          />
        )}
        {step === 4 && (
          <Step4MainQuest
            value={form.mainQuestText}
            onChange={(v) => update('mainQuestText', v)}
          />
        )}
        {step === 5 && (
          <Step5Intentions
            career={form.career}
            dsa={form.dsa}
            training={form.training}
            onChangeCareer={(patch) => updateIntention('career', patch)}
            onChangeDsa={(patch) => updateIntention('dsa', patch)}
            onChangeTraining={(patch) => updateIntention('training', patch)}
          />
        )}
        {step === 6 && (
          <Step6Baseline
            heightCm={form.heightCm}
            weightKg={form.weightKg}
            problemsSolvedSoFar={form.problemsSolvedSoFar}
            onChangeHeight={(v) => update('heightCm', v)}
            onChangeWeight={(v) => update('weightKg', v)}
            onChangeProblems={(v) => update('problemsSolvedSoFar', v)}
            career={form.career}
            dsa={form.dsa}
            onCopyTimes={handleCopyTimes}
            copied={copied}
          />
        )}
      </div>

      {error && <p className="mt-2 text-sm text-state-alert">{error}</p>}

      <div className="mt-4 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-2 text-sm text-text"
          >
            Back
          </button>
        )}
        {step < 6 ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="min-h-[44px] flex-1 rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            {step === 1 ? 'Begin' : 'Next'}
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleInitialise}
            className="min-h-[44px] flex-1 rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
          >
            {isSubmitting ? 'Initialising…' : 'Initialise system'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────

function Step1Framing({ name, onChangeName }: { name: string; onChangeName: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-md text-text">This system asks for evidence, not effort.</p>
      <p className="text-sm text-text-dim">
        It will tell you whether four months changed anything.
      </p>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
          placeholder="Your name"
        />
      </label>
    </div>
  );
}

function Step2Arc({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ARC</h1>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Start</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChangeStart(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">End</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChangeEnd(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <p className="text-sm text-text-dim">{dayCount(startDate, endDate)} days</p>
      <p className="text-xs text-text-faint">Timezone Asia/Kolkata. Day rolls over at 04:00.</p>
    </div>
  );
}

function Step3Rhythm({
  wakeTime,
  sleepTime,
  trainingDays,
  stepsTarget,
  screenCapMinutes,
  attentionApps,
  onChangeWake,
  onChangeSleep,
  onChangeTrainingDays,
  onChangeStepsTarget,
  onChangeScreenCap,
  onChangeAttentionApps,
}: {
  wakeTime: string;
  sleepTime: string;
  trainingDays: string[];
  stepsTarget: number;
  screenCapMinutes: number;
  attentionApps: string[];
  onChangeWake: (v: string) => void;
  onChangeSleep: (v: string) => void;
  onChangeTrainingDays: (v: string[]) => void;
  onChangeStepsTarget: (v: number) => void;
  onChangeScreenCap: (v: number) => void;
  onChangeAttentionApps: (v: string[]) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">RHYTHM</h1>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Wake target</span>
        <input
          type="time"
          value={wakeTime}
          onChange={(e) => onChangeWake(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Sleep target</span>
        <input
          type="time"
          value={sleepTime}
          onChange={(e) => onChangeSleep(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <p className="text-xs text-text-faint">Day closes at 03:00.</p>
      <ChipToggle
        label="Training days"
        options={TRAINING_DAY_OPTIONS}
        selected={trainingDays}
        onChange={onChangeTrainingDays}
      />
      <Stepper
        label="Steps target"
        value={stepsTarget}
        step={500}
        min={0}
        onChange={onChangeStepsTarget}
      />
      <Stepper
        label="Screen cap"
        value={screenCapMinutes}
        step={5}
        min={0}
        suffix="min"
        onChange={onChangeScreenCap}
      />
      <ChipToggle
        label="Apps to watch"
        options={ATTENTION_APP_OPTIONS}
        selected={attentionApps}
        onChange={onChangeAttentionApps}
      />
    </div>
  );
}

function Step4MainQuest({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">MAIN QUEST</h1>
      <p className="text-sm text-text-dim">
        One sentence. What has to be true on {DEFAULT_CONFIG.arc.endDate}?
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-border bg-surface-2 p-3 text-text"
        placeholder="This is the only thing the app judges you against."
      />
    </div>
  );
}

function IntentionFields({
  label,
  testId,
  placeholderPlace,
  placeholderAction,
  value,
  onChange,
}: {
  label: string;
  testId: string;
  placeholderPlace: string;
  placeholderAction: string;
  value: IntentionDraft;
  onChange: (patch: Partial<IntentionDraft>) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3" data-testid={testId}>
      <div className="text-xxs uppercase tracking-wide text-text-dim">{label}</div>
      <div className="flex items-center gap-2 text-sm text-text-dim">
        <span>At</span>
        <input
          type="time"
          value={value.time}
          onChange={(e) => onChange({ time: e.target.value })}
          className="min-h-[44px] rounded-md border border-border bg-surface-2 px-2 text-text"
        />
        <span>at</span>
        <input
          type="text"
          value={value.place}
          onChange={(e) => onChange({ place: e.target.value })}
          placeholder={placeholderPlace}
          data-testid={`${testId}-place`}
          className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-2 px-2 text-text"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-text-dim">
        <span>I will</span>
        <input
          type="text"
          value={value.first_action}
          onChange={(e) => onChange({ first_action: e.target.value })}
          placeholder={placeholderAction}
          data-testid={`${testId}-action`}
          className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-2 px-2 text-text"
        />
      </div>
    </div>
  );
}

function Step5Intentions({
  career,
  dsa,
  training,
  onChangeCareer,
  onChangeDsa,
  onChangeTraining,
}: {
  career: IntentionDraft;
  dsa: IntentionDraft;
  training: IntentionDraft;
  onChangeCareer: (patch: Partial<IntentionDraft>) => void;
  onChangeDsa: (patch: Partial<IntentionDraft>) => void;
  onChangeTraining: (patch: Partial<IntentionDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">WHEN AND WHERE</h1>
      <p className="text-sm text-text-dim">
        Finish these. They matter more than any other setting here.
      </p>
      <IntentionFields
        label="Career"
        testId="career-intention"
        placeholderPlace="my desk"
        placeholderAction="open the job board before anything"
        value={career}
        onChange={onChangeCareer}
      />
      <IntentionFields
        label="DSA"
        testId="dsa-intention"
        placeholderPlace="my desk"
        placeholderAction="open the editor"
        value={dsa}
        onChange={onChangeDsa}
      />
      <IntentionFields
        label="Training"
        testId="training-intention"
        placeholderPlace="the gym"
        placeholderAction="change & start"
        value={training}
        onChange={onChangeTraining}
      />
    </div>
  );
}

function Step6Baseline({
  heightCm,
  weightKg,
  problemsSolvedSoFar,
  onChangeHeight,
  onChangeWeight,
  onChangeProblems,
  career,
  dsa,
  onCopyTimes,
  copied,
}: {
  heightCm: string;
  weightKg: string;
  problemsSolvedSoFar: string;
  onChangeHeight: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeProblems: (v: string) => void;
  career: IntentionDraft;
  dsa: IntentionDraft;
  onCopyTimes: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">BASELINE</h1>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Height (cm)</span>
        <input
          type="number"
          inputMode="numeric"
          value={heightCm}
          onChange={(e) => onChangeHeight(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">Weight (kg)</span>
        <input
          type="number"
          inputMode="numeric"
          value={weightKg}
          onChange={(e) => onChangeWeight(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>
      <p className="text-xs text-text-faint">
        Body fat — skip for now. Yours is unknown; it stays unknown and optional until you have a
        method you trust.
      </p>
      <label className="block">
        <span className="text-xxs uppercase tracking-wide text-text-dim">
          Problems solved so far (optional)
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={problemsSolvedSoFar}
          onChange={(e) => onChangeProblems(e.target.value)}
          className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
        />
      </label>

      <div className="rounded-md border border-border p-3">
        <div className="mb-2 text-xxs uppercase tracking-wide text-text-dim">
          Three phone alarms
        </div>
        <ul className="space-y-1 text-sm text-text-dim">
          <li>{alarmLabel(career, 'CAREER')}</li>
          <li>{alarmLabel(dsa, 'DSA')}</li>
          <li>23:30 — Evening review. 25 seconds.</li>
        </ul>
        <button
          type="button"
          onClick={onCopyTimes}
          className="mt-3 min-h-[44px] w-full rounded-md border border-border bg-surface-2 text-sm text-text"
        >
          {copied ? 'Copied' : 'Copy times'}
        </button>
        <p className="mt-2 text-xs text-text-faint">
          Add these in your phone's Clock app as repeating alarms.
        </p>
      </div>
    </div>
  );
}
