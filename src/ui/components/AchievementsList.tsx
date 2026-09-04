import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { localDate } from '../../engine/time';
import { realDeps } from '../../store/deps';
import { getAchievementsReport, type AchievementsReport } from '../../store/achievements';

/** final/01 §8 — "each a statement of accumulated fact... no achievement
 * for perfect days, perfect weeks, or streak length." final/06's cut
 * list: "achievement gallery (a list on Profile suffices)" — so this is
 * exactly that, earned items only, no locked-item grid. */
export function AchievementsList() {
  const [report, setReport] = useState<AchievementsReport | null>(null);

  useEffect(() => {
    const today = localDate(realDeps.now(), DEFAULT_CONFIG.arc.timezone, DEFAULT_CONFIG.arc.dayBoundaryHour);
    void getAchievementsReport(today, DEFAULT_CONFIG).then(setReport);
  }, []);

  if (!report) return null;
  const earnedAchievements = report.achievements.filter((a) => a.earned);
  const earnedIdentities = report.identities.filter((i) => i.earned);
  if (earnedAchievements.length === 0 && earnedIdentities.length === 0) return null;

  return (
    <div className="mt-3" data-testid="achievements-list">
      {earnedAchievements.length > 0 && (
        <>
          <div className="mb-1 text-xxs uppercase tracking-wide text-text-faint">Achievements</div>
          <p className="text-sm text-text-dim">{earnedAchievements.map((a) => a.label).join(' · ')}</p>
        </>
      )}
      {earnedIdentities.length > 0 && (
        <>
          <div className="mb-1 mt-2 text-xxs uppercase tracking-wide text-text-faint">Identities</div>
          <p className="text-sm text-text-dim">{earnedIdentities.map((i) => i.label).join(' · ')}</p>
        </>
      )}
    </div>
  );
}
