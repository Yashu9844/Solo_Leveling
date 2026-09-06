import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '../../engine/config';
import { realDeps } from '../../store/deps';
import { getTodayMaintenance, logMaintenance } from '../../store/lifestyle';

interface MaintenanceCardProps {
  today: string;
  arcId: string;
  arcStartDate: string;
  onChanged: () => void;
}

const ITEMS: { field: 'bath' | 'fuel' | 'laundry'; label: string }[] = [
  { field: 'bath', label: 'Bath' },
  { field: 'fuel', label: 'Ate to plan' },
  { field: 'laundry', label: 'Laundry' },
];

/** final/04 §6 — one zero-pressure row, excluded from core-completion %,
 * every attribute, and every rank gate. Ticking is auto-saved (no submit
 * button). Deliberately one compact row of pills rather than a stacked
 * checklist — final/06's "six rows reachable without scrolling" budget on
 * Today leaves no room for a taller card here (a Slice 9 layout fix after
 * the first version overflowed the Pixel 7 viewport in e2e). */
export function MaintenanceCard({ today, arcId, arcStartDate, onChanged }: MaintenanceCardProps) {
  const [state, setState] = useState({ bath: false, fuel: false, laundry: false });
  const [laundryDue, setLaundryDue] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { row, laundryDue: due } = await getTodayMaintenance(today, arcStartDate, DEFAULT_CONFIG.maintenanceLaundryEveryDays);
      setState({ bath: row?.bath ?? false, fuel: row?.fuel ?? false, laundry: row?.laundry ?? false });
      setLaundryDue(due);
    })();
  }, [today, arcStartDate]);

  async function toggle(field: 'bath' | 'fuel' | 'laundry') {
    const next = { ...state, [field]: !state[field] };
    setState(next);
    setSaving(true);
    try {
      await logMaintenance(today, arcId, next, DEFAULT_CONFIG, realDeps);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  const visibleItems = ITEMS.filter((item) => item.field !== 'laundry' || laundryDue);

  return (
    <div
      className="cut-sm mt-2 flex flex-wrap items-center gap-1.5 px-3 py-1.5"
      data-testid="maintenance-card"
      style={{ border: '1px solid var(--hair)', background: 'var(--surface)' }}
    >
      <span className="text-xxs uppercase text-ink-700">Maint</span>
      {visibleItems.map(({ field, label }) => {
        const active = state[field];
        return (
          <button
            key={field}
            type="button"
            onClick={() => void toggle(field)}
            disabled={saving}
            aria-pressed={active}
            className="rounded-pill px-2.5 py-0.5 text-xs transition-colors duration-150 disabled:opacity-60"
            style={{
              border: `1px solid ${active ? 'var(--accent)' : 'var(--hair)'}`,
              background: active ? 'var(--fill-faint)' : 'var(--surface-2)',
              color: active ? 'var(--accent-mid)' : 'var(--ink-900)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
