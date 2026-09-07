import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../store/SettingsContext';
import {
  ACCENTS,
  ART_INTENSITIES,
  DENSITIES,
  MOTIONS,
  TEXT_SCALES,
  THEMES,
  type AccentKey,
} from '../../store/settings';
import { ScreenHeader, Segmented, SettingsGroup, SettingsList, SettingsRow } from '../kit';
import {
  ART_LABELS,
  DENSITY_LABELS,
  MOTION_LABELS,
  TEXT_SCALE_LABELS,
  THEME_LABELS,
} from './labels';

/**
 * Everything visual, applied the instant it changes.
 *
 * design/03 §4: no Save button anywhere in settings. A preference you
 * have to commit to is a preference you cannot try, and every control
 * here is reversible in one tap.
 */
export function AppearanceScreen() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();

  return (
    <>
      <ScreenHeader title="APPEARANCE" onBack={() => navigate('/profile/settings')} />
      <div className="px-gutter pb-8" data-testid="appearance-screen">
        <SettingsGroup title="Theme" choice>
          <SettingsList>
            {THEMES.map((t) => (
              <SettingsRow
                key={t}
                label={THEME_LABELS[t]}
                selected={settings.theme === t}
                onClick={() => update({ theme: t })}
                testId={`theme-${t}`}
              />
            ))}
          </SettingsList>
        </SettingsGroup>

        <SettingsGroup
          choice
          title="Accent"
          footnote="No green: a completed quest circle fills with the accent, and complete is green — the two would become indistinguishable."
        >
          <SettingsList>
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
              <SettingsRow
                key={key}
                label={ACCENTS[key].label}
                value={<Swatch accent={key} />}
                selected={settings.accent === key}
                onClick={() => update({ accent: key })}
                testId={`accent-${key}`}
              />
            ))}
          </SettingsList>
        </SettingsGroup>

        <SettingsGroup
          title="Text size"
          footnote="Scales the whole type scale, not just body copy — otherwise headings and data stop relating to each other at the extremes."
        >
          <SettingsRow
            label="Size"
            control={
              <Segmented
                value={settings.textScale}
                onChange={(v) => update({ textScale: v })}
                options={TEXT_SCALES.map((v) => ({ value: v, label: TEXT_SCALE_LABELS[v] }))}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Layout & motion">
          <SettingsList>
            <SettingsRow
              label="Density"
              control={
                <Segmented
                  value={settings.density}
                  onChange={(v) => update({ density: v })}
                  options={DENSITIES.map((v) => ({ value: v, label: DENSITY_LABELS[v] }))}
                />
              }
            />
            <SettingsRow
              label="Motion"
              description="System follows your device's reduce-motion setting."
              control={
                <Segmented
                  value={settings.motion}
                  onChange={(v) => update({ motion: v })}
                  options={MOTIONS.map((v) => ({ value: v, label: MOTION_LABELS[v] }))}
                />
              }
            />
          </SettingsList>
        </SettingsGroup>

        <SettingsGroup
          title="Art"
          footnote="Every screen is designed to look finished with no art at all, so turning it off costs nothing but atmosphere."
        >
          <SettingsList>
            <SettingsRow
              label="Plates"
              control={
                <Segmented
                  value={settings.art}
                  onChange={(v) => update({ art: v })}
                  options={ART_INTENSITIES.map((v) => ({ value: v, label: ART_LABELS[v] }))}
                />
              }
            />
            <SettingsRow
              label="Glow"
              control={
                <Segmented
                  value={settings.glow ? 'on' : 'off'}
                  onChange={(v) => update({ glow: v === 'on' })}
                  options={[
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' },
                  ]}
                />
              }
            />
          </SettingsList>
        </SettingsGroup>
      </div>
    </>
  );
}

/** The accent's actual colour, so the list is picked by eye rather than
 * by reading six names. `theme` has no hex of its own — it means
 * "whatever this theme declares" — so it shows the live token. */
function Swatch({ accent }: { accent: AccentKey }) {
  const hex = ACCENTS[accent].hex;
  return (
    <span
      aria-hidden
      // inline-block, or the span collapses to a sliver: it sits inside
      // the row's trailing text span, where an inline element takes its
      // width from content it does not have.
      className="inline-block h-3 w-3 rounded-pill align-middle"
      style={{ background: hex ?? 'var(--accent)', border: '1px solid var(--hair)' }}
    />
  );
}
