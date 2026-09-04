import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { getWeeklyReview, type WeeklyReviewReport } from '../../store/weeklyReview';
import type { Attribute } from '../../engine/types';

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  DISCIPLINE: 'Discipline',
  DEPTH: 'Depth',
  PROBLEM_SOLVING: 'Problem solving',
  ENGINEERING: 'Engineering',
  MOMENTUM: 'Momentum',
  VITALITY: 'Vitality',
};

interface WeeklyReviewProps {
  today: string;
  onClose: () => void;
}

function Delta({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const diff = current - previous;
  if (diff === 0) return null;
  return (
    <span className="ml-1 text-xxs text-text-faint">
      {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}
      {suffix}
    </span>
  );
}

/** final/05 §6 — 3 minutes, ends in decisions. Real numbers only: the
 * correlational insight sentence and the resume-content nudge in the
 * mockup are deferred (need either real correlation analysis or
 * free-text authoring this slice doesn't build — see the Slice 11
 * report); everything shown here is a real, computed number. */
export function WeeklyReview({ today, onClose }: WeeklyReviewProps) {
  const [report, setReport] = useState<WeeklyReviewReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getWeeklyReview(today, DEFAULT_CONFIG).then((r) => {
      if (!cancelled) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg p-4" data-testid="weekly-review">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">SYSTEM EVALUATION</h1>
        <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] text-text-dim">
          ✕
        </button>
      </div>

      {!report ? (
        <p className="mt-4 text-sm text-text-dim">Loading…</p>
      ) : (
        <div className="mt-4 space-y-4 font-mono text-sm text-text">
          <div>
            <Row label="XP">
              {report.thisWeek.xpEarned.toLocaleString()}
              <Delta current={report.thisWeek.xpEarned} previous={report.lastWeek.xpEarned} />
            </Row>
            <Row label="Deep work">
              {Math.round(report.thisWeek.deepWorkMinutes / 60)}h {report.thisWeek.deepWorkMinutes % 60}m
              <Delta current={report.thisWeek.deepWorkMinutes} previous={report.lastWeek.deepWorkMinutes} suffix="m" />
            </Row>
          </div>

          <div className="border-t border-border pt-3">
            <Row label="Career">
              {report.thisWeek.applications} applications ({report.thisWeek.qualityApplications} quality)
            </Row>
            <Row label="DSA">{report.thisWeek.problems} problems</Row>
            <Row label="Build">{report.thisWeek.buildSessions} sessions</Row>
            <Row label="Learn">{report.thisWeek.learnBlocks} blocks</Row>
            <Row label="Training">
              {report.thisWeek.trainingSessions} sessions · steps {Math.round(report.thisWeek.meanSteps).toLocaleString()}/day
            </Row>
          </div>

          <div className="border-t border-border pt-3 text-xs">
            {report.review.improved.length > 0 && (
              <p className="text-text-dim">IMPROVED {report.review.improved.map((a) => ATTRIBUTE_LABELS[a]).join(' · ')}</p>
            )}
            {report.review.declined.length > 0 && (
              <p className="mt-1 text-text-dim">DECLINED {report.review.declined.map((a) => ATTRIBUTE_LABELS[a]).join(' · ')}</p>
            )}
            {report.review.bottleneck && (
              <p className="mt-1 text-accent">BOTTLENECK {ATTRIBUTE_LABELS[report.review.bottleneck]}</p>
            )}
          </div>

          {report.review.proposals.length > 0 && (
            <div className="border-t border-border pt-3">
              <div className="mb-1 text-xxs uppercase tracking-wide text-text-faint">Next week — proposed</div>
              {report.review.proposals.map((p) => (
                <p key={p.rule} className="text-xs text-text-dim">
                  → {p.message}
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-[44px] w-full rounded-md bg-accent text-sm font-medium text-bg"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-xs text-text-dim">{label}</span>
      <span className="text-right tabular-nums text-text">{children}</span>
    </div>
  );
}
