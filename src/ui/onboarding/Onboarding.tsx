import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_CONFIG } from '../../engine/config';
import type { ImplementationIntention } from '../../engine/types';
import { initialiseArc, type OnboardingInput } from '../../store/onboarding';
import { realDeps } from '../../store/deps';
import { useArcStatus } from '../../store/ArcStatusContext';
import { ChipToggle } from '../components/ChipToggle';
import { Stepper } from '../components/Stepper';
import {
  ArtLayer,
  Field,
  FramedPanel,
  PrimaryButton,
  SafeTop,
  ScreenShell,
  SecondaryButton,
  StepTitle,
  TextArea,
  TextInput,
} from '../kit';

const TOTAL_STEPS = 6;

/**
 * Six segments, filled to the current step.
 *
 * Replaces a bare "3/6". A rail shows how much is left without the user
 * doing arithmetic, which matters on a flow with a 90-second budget —
 * the thing that makes someone abandon onboarding is not knowing whether
 * they are near the end.
 */
function StepRail({ step }: { step: number }) {
  return (
    <div
      className="flex gap-1.5 px-gutter pt-4"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const index = i + 1;
        const done = index < step;
        const current = index === step;
        return (
          <span
            key={index}
            className="h-[3px] flex-1 rounded-pill transition-all duration-300"
            style={{
              background: done || current ? 'var(--accent)' : 'var(--surface-2)',
              opacity: done ? 0.55 : 1,
              boxShadow: current ? 'var(--glow-sm)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

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

  // Art bookends the flow: the first step, where the user is deciding
  // whether to start, and the last, where they are about to commit. The
  // four steps between are forms, and a form does not want a backdrop.
  const showArt = step === 1 || step === TOTAL_STEPS;

  return (
    <ScreenShell>
      <div className="relative flex flex-1 flex-col overflow-hidden text-ink-100">
        {showArt && <ArtLayer slot="onboarding" scrim="moment" priority={step === 1} />}

        <div className="relative flex min-h-0 flex-1 flex-col">
          <SafeTop />
          <StepRail step={step} />

          {/* `my-auto` rather than `justify-center`: auto margins absorb
              free space when a step is short (steps 1, 2 and 4 leave a
              large dead zone otherwise) and collapse to nothing when it
              is tall, so steps 3, 5 and 6 still scroll from their top.
              justify-center would clip the top of an overflowing step. */}
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-gutter pb-4 pt-5">
            <FramedPanel className="my-auto shrink-0 px-5 py-6">
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
            </FramedPanel>
          </div>

          {error && (
            <p className="px-gutter pb-2 text-sm text-state-alert" role="alert">
              {error}
            </p>
          )}

          {/* Pinned: the action never scrolls out of reach on a small
              screen, which is where a six-step flow loses people. */}
          <div
            className="flex shrink-0 gap-3 px-gutter pt-2"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {step > 1 && (
              <SecondaryButton onClick={() => setStep((s) => s - 1)} className="flex-[0_0_38%]">
                Back
              </SecondaryButton>
            )}
            {step < TOTAL_STEPS ? (
              <PrimaryButton
                size="md"
                disabled={!canProceed}
                onClick={() => setStep((s) => s + 1)}
                className="flex-1"
              >
                {step === 1 ? 'Begin' : 'Next'}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                size="md"
                disabled={isSubmitting}
                onClick={handleInitialise}
                className="flex-1"
              >
                {isSubmitting ? 'Initialising…' : 'Initialise system'}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

// ── Step components ────────────────────────────────────────────────────

function Step1Framing({ name, onChangeName }: { name: string; onChangeName: (v: string) => void }) {
  return (
    <div className="space-y-6">
      {/* The first sentence carries the whole product's premise, so it is
          set at display weight rather than as body copy. */}
      <p className="font-display text-title leading-[1.25] text-ink-100">
        This system asks for evidence, not effort.
      </p>
      <p className="text-sm text-ink-500">
        It will tell you whether four months changed anything.
      </p>
      <div className="hairline" aria-hidden />
      <Field label="Name">
        <TextInput
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Your name"
          autoComplete="given-name"
        />
      </Field>
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
    <div className="space-y-5">
      <StepTitle>Arc</StepTitle>
      <Field label="Start">
        <TextInput type="date" value={startDate} onChange={(e) => onChangeStart(e.target.value)} />
      </Field>
      <Field label="End">
        <TextInput type="date" value={endDate} onChange={(e) => onChangeEnd(e.target.value)} />
      </Field>

      {/* The length is the number that makes the commitment concrete, so
          it gets the mono treatment every other real figure gets. */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xl tabular-nums text-accent-mid">
          {dayCount(startDate, endDate)}
        </span>
        <span className="text-xxs uppercase text-ink-700">days</span>
      </div>
      <p className="text-xs text-faint">Timezone Asia/Kolkata. Day rolls over at 04:00.</p>
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
    <div className="space-y-5">
      <StepTitle>Rhythm</StepTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wake">
          <TextInput type="time" value={wakeTime} onChange={(e) => onChangeWake(e.target.value)} />
        </Field>
        <Field label="Sleep">
          <TextInput type="time" value={sleepTime} onChange={(e) => onChangeSleep(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-faint">Day closes at 03:00.</p>
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
    <div className="space-y-5">
      <StepTitle>Main quest</StepTitle>
      <p className="text-sm text-ink-500">
        One sentence. What has to be true on {DEFAULT_CONFIG.arc.endDate}?
      </p>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
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
    <div
      className="space-y-3 rounded-sm p-4"
      data-testid={testId}
      style={{ background: 'var(--surface)', borderLeft: '2px solid var(--accent)' }}
    >
      <div className="text-xxs uppercase text-accent-mid">{label}</div>

      {/* One clause per row, with the connecting words on a fixed column
          so the fields align. Wrapping the sentence inline looked better
          on paper and failed on a phone: the time picker eats most of the
          row, squeezing "my desk" down to "my d" at 390px, and at 320px
          the word "at" wraps and is orphaned at the end of a line. The
          sentence still reads top to bottom. */}
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <span className="w-12 shrink-0">At</span>
        <TextInput
          type="time"
          value={value.time}
          onChange={(e) => onChange({ time: e.target.value })}
          className="!w-auto min-w-0 flex-1 px-2"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <span className="w-12 shrink-0">at</span>
        <TextInput
          type="text"
          value={value.place}
          onChange={(e) => onChange({ place: e.target.value })}
          placeholder={placeholderPlace}
          data-testid={`${testId}-place`}
          className="!w-auto min-w-0 flex-1 px-2"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <span className="w-12 shrink-0">I will</span>
        <TextInput
          type="text"
          value={value.first_action}
          onChange={(e) => onChange({ first_action: e.target.value })}
          placeholder={placeholderAction}
          data-testid={`${testId}-action`}
          className="!w-auto min-w-0 flex-1 px-2"
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
      <StepTitle>When and where</StepTitle>
      {/* final/06 §5.1 marks this step "THE IMPORTANT ONE". Implementation
          intentions are the highest-leverage thing in onboarding, so the
          instruction is stated plainly rather than softened. */}
      <p className="text-sm text-ink-300">
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
    <div className="space-y-5">
      <StepTitle>Baseline</StepTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Height (cm)">
          <TextInput
            type="number"
            inputMode="numeric"
            value={heightCm}
            onChange={(e) => onChangeHeight(e.target.value)}
          />
        </Field>
        <Field label="Weight (kg)">
          <TextInput
            type="number"
            inputMode="numeric"
            value={weightKg}
            onChange={(e) => onChangeWeight(e.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs text-faint">
        Body fat — skip for now. Yours is unknown; it stays unknown and optional until you have a
        method you trust.
      </p>
      <Field label="Problems solved so far (optional)">
        <TextInput
          type="number"
          inputMode="numeric"
          value={problemsSolvedSoFar}
          onChange={(e) => onChangeProblems(e.target.value)}
        />
      </Field>

      <div className="cut-sm p-4" style={{ background: 'var(--surface)' }}>
        <div className="mb-3 text-xxs uppercase text-ink-700">Three phone alarms</div>
        {/* Mono and tabular: these are times the user is about to copy
            into a Clock app, so they have to line up. */}
        <ul className="space-y-2 font-mono text-xs tabular-nums text-ink-500">
          <li>{alarmLabel(career, 'CAREER')}</li>
          <li>{alarmLabel(dsa, 'DSA')}</li>
          <li>23:30 — Evening review. 25 seconds.</li>
        </ul>
        <SecondaryButton onClick={onCopyTimes} className="mt-4">
          {copied ? 'Copied' : 'Copy times'}
        </SecondaryButton>
        <p className="mt-3 text-xs text-faint">
          Add these in your phone&rsquo;s Clock app as repeating alarms.
        </p>
      </div>
    </div>
  );
}
