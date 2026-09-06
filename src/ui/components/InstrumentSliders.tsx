import type { Automaticity, Enjoyment, SelfEfficacy } from '../../store/checkpoint';

export type SelfEfficacyItems = SelfEfficacy['items'];
export type AutomaticityItems = Automaticity['items'];
export type EnjoymentItems = Enjoyment['items'];

// docs/13-day0-baseline.md — exact item wording, shared by the Day-0
// baseline row (Profile.tsx) and every later checkpoint's instrument
// section (CheckpointScreen.tsx), since both administer the same three
// instruments (docs/04 §5.2-5.3: "administered at Day 0/30/60/90/120").
export const SELF_EFFICACY_QUESTIONS = [
  'Solve an unseen medium DSA problem in 25 minutes, in front of an interviewer?',
  "Explain your last project's architecture to a senior engineer for 10 minutes?",
  'Design an evaluation suite for an agent from a blank file?',
  "Complete your planned training session on a day you don't feel like it?",
  'Hold your wake time within 30 minutes for the next 14 days?',
  'Apply to 5 roles above your current level this week?',
] as const;

export const AUTOMATICITY_QUESTIONS = ['Waking at my target time', 'Training', 'Daily study', 'Sleeping at my target time'] as const;

export const ENJOYMENT_QUESTIONS = ['DSA', 'Building/AI', 'Training'] as const;

interface InstrumentSlidersProps {
  title: string;
  questions: readonly string[];
  values: number[];
  onChange: (values: number[]) => void;
  min: number;
  max: number;
  step: number;
}

/** A titled group of slider questions, all sharing one scale — the
 * shared rendering for all three instruments (self-efficacy 0-100,
 * automaticity 1-7, enjoyment 0-10), which differ only in scale and
 * question text. */
export function InstrumentSliders({ title, questions, values, onChange, min, max, step }: InstrumentSlidersProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-faint">{title}</p>
      {questions.map((question, idx) => (
        <label key={question} className="block">
          <span className="text-sm text-text">
            {idx + 1}. {question}
          </span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={values[idx]}
              onChange={(e) => onChange(values.map((v, i) => (i === idx ? Number(e.target.value) : v)))}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono text-sm tabular-nums text-text">{values[idx]}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
