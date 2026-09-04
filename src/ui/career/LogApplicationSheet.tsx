import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { logApplication, logSubstituteWork, createResumeVersion, getResumeVersions } from '../../store/career';
import type { ResumeVersionRow } from '../../db/schema';
import { SingleChipSelect } from '../components/SingleChipSelect';

const ROLE_CATEGORIES = ['backend', 'ai', 'fullstack', 'platform', 'other'] as const;
const ROLE_CATEGORY_LABELS: Record<(typeof ROLE_CATEGORIES)[number], string> = {
  backend: 'Backend',
  ai: 'AI',
  fullstack: 'Fullstack',
  platform: 'Platform',
  other: 'Other',
};
const SOURCES = ['jobboard', 'referral', 'company_site', 'recruiter', 'network'] as const;
const SOURCE_LABELS: Record<(typeof SOURCES)[number], string> = {
  jobboard: 'Board',
  referral: 'Referral',
  company_site: 'Site',
  recruiter: 'Recruiter',
  network: 'Network',
};
const SUBSTITUTE_KINDS = ['resume_iteration', 'followups', 'networking', 'portfolio', 'writeup', 'mock'] as const;
const SUBSTITUTE_LABELS: Record<(typeof SUBSTITUTE_KINDS)[number], string> = {
  resume_iteration: 'Resume iteration',
  followups: 'Follow-ups',
  networking: 'Networking message',
  portfolio: 'Portfolio / README',
  writeup: 'Write-up drafting',
  mock: 'Mock interview',
};

interface LogApplicationSheetProps {
  today: string;
  arcId: string;
  onClose: () => void;
}

/** final/06 §5.4. Logging an application (or substitute work) is what
 * completes the CAREER quest — see store/career.ts's
 * maybeCompleteCareerQuest, run after every log. */
export function LogApplicationSheet({ today, arcId, onClose }: LogApplicationSheetProps) {
  const [mode, setMode] = useState<'application' | 'substitute'>('application');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<(typeof ROLE_CATEGORIES)[number] | null>(null);
  const [source, setSource] = useState<(typeof SOURCES)[number] | null>(null);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersionRow[]>([]);
  const [resumeVersionId, setResumeVersionId] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [whyLine, setWhyLine] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'pass' | 'fail' | null>(null);

  const [substituteMinutes, setSubstituteMinutes] = useState(25);
  const [substituteKind, setSubstituteKind] = useState<(typeof SUBSTITUTE_KINDS)[number]>('resume_iteration');

  useEffect(() => {
    getResumeVersions().then((versions) => {
      setResumeVersions(versions);
      if (versions.length > 0) setResumeVersionId(versions[0]!.id);
    });
  }, []);

  async function handleCreateVersion() {
    if (!newVersionLabel.trim()) return;
    const id = await createResumeVersion(newVersionLabel.trim(), 'Created from the application log', arcId, realDeps);
    const versions = await getResumeVersions();
    setResumeVersions(versions);
    setResumeVersionId(id);
    setNewVersionLabel('');
  }

  async function handleLogApplication() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const qualityPass = await logApplication(
        today,
        arcId,
        {
          company: company.trim(),
          role: role.trim(),
          roleCategory: category ?? 'other',
          source: source ?? 'jobboard',
          resumeVersionId,
          whyLine: whyLine.trim(),
        },
        DEFAULT_CONFIG,
        realDeps
      );
      setResult(qualityPass ? 'pass' : 'fail');
      if (qualityPass) {
        setTimeout(onClose, 900);
      }
    } finally {
      // Runs on both success and a thrown error — a write that throws
      // must never leave the button stuck on "Logging…" forever.
      setSubmitting(false);
    }
  }

  async function handleLogSubstitute() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await logSubstituteWork(today, arcId, substituteMinutes, substituteKind, DEFAULT_CONFIG, realDeps);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const canLogApplication =
    company.trim().length > 0 && role.trim().length > 0 && resumeVersionId !== '' && whyLine.trim().length >= 15;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-md border-t border-border bg-surface p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">
            {mode === 'application' ? 'LOG APPLICATION' : 'SUBSTITUTE WORK'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
            ✕
          </button>
        </div>

        {mode === 'application' ? (
          <>
            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">Company</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
              />
            </label>
            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">Role</span>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
              />
            </label>

            <SingleChipSelect
              label="Category"
              options={ROLE_CATEGORIES}
              labelFor={(k) => ROLE_CATEGORY_LABELS[k]}
              selected={category}
              onSelect={setCategory}
            />
            <SingleChipSelect
              label="Source"
              options={SOURCES}
              labelFor={(k) => SOURCE_LABELS[k]}
              selected={source}
              onSelect={setSource}
            />

            <div>
              <span className="text-xxs uppercase tracking-wide text-text-dim">Resume — required</span>
              {resumeVersions.length > 0 && (
                <select
                  value={resumeVersionId}
                  onChange={(e) => setResumeVersionId(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
                >
                  {resumeVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                  placeholder="New version label, e.g. v2 — AI-weighted"
                  className="min-h-[44px] flex-1 rounded-md border border-border bg-surface-2 px-3 text-text"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateVersion()}
                  className="min-h-[44px] rounded-md border border-border px-3 text-sm text-text"
                >
                  + New
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">
                Why this role? — required, ≥15 chars
              </span>
              <textarea
                value={whyLine}
                onChange={(e) => setWhyLine(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-surface-2 p-3 text-text"
              />
            </label>

            {result === 'fail' && (
              <p className="text-xs text-state-alert">
                Logged, but the quality gate didn't pass — this one earns 0 XP. Flagged for the weekly review.
              </p>
            )}
            {result === 'pass' && <p className="text-xs text-accent">Logged.</p>}

            <button
              type="button"
              disabled={!canLogApplication || submitting}
              onClick={() => void handleLogApplication()}
              className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
            >
              {submitting ? 'Logging…' : 'Log application'}
            </button>

            <button
              type="button"
              onClick={() => setMode('substitute')}
              className="min-h-[44px] rounded-md border border-border text-sm text-text-dim"
            >
              Substitute career work instead
            </button>
          </>
        ) : (
          <>
            <SingleChipSelect
              label="What kind of work?"
              options={SUBSTITUTE_KINDS}
              labelFor={(k) => SUBSTITUTE_LABELS[k]}
              selected={substituteKind}
              onSelect={setSubstituteKind}
            />
            <label className="block">
              <span className="text-xxs uppercase tracking-wide text-text-dim">Minutes</span>
              <input
                type="number"
                inputMode="numeric"
                value={substituteMinutes}
                onChange={(e) => setSubstituteMinutes(Number(e.target.value))}
                className="mt-1 w-full min-h-[44px] rounded-md border border-border bg-surface-2 px-3 text-text"
              />
            </label>
            <button
              type="button"
              disabled={submitting || substituteMinutes <= 0}
              onClick={() => void handleLogSubstitute()}
              className="min-h-[44px] rounded-md bg-accent text-sm font-medium text-bg disabled:opacity-40"
            >
              {submitting ? 'Logging…' : 'Log substitute work'}
            </button>
            <button
              type="button"
              onClick={() => setMode('application')}
              className="min-h-[44px] rounded-md border border-border text-sm text-text-dim"
            >
              Log an application instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
