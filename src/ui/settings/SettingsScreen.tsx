import { Info, PaintBrush } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../store/SettingsContext';
import { ACCENTS } from '../../store/settings';
import { ScreenHeader, SettingsGroup, SettingsList, SettingsRow } from '../kit';
import { THEME_LABELS, TEXT_SCALE_LABELS } from './labels';

/**
 * The settings index. Each section is a pushed route.
 *
 * A child route of the profile tab (design/02 §3.2), so the bottom nav
 * stays visible and the frozen four-tab contract is untouched. Sections
 * are pushed screens rather than an accordion: on a phone, an expanding
 * list of thirty controls loses its place the moment you scroll.
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // "Arc · Arc" is what showed when the accent follows the theme, which
  // says nothing twice. Following the theme is the default, so it needs
  // no second word at all.
  const summary =
    settings.accent === 'theme'
      ? THEME_LABELS[settings.theme]
      : `${THEME_LABELS[settings.theme]} · ${ACCENTS[settings.accent].label}`;

  return (
    <>
      <ScreenHeader title="SETTINGS" onBack={() => navigate('/profile')} />
      <div className="px-gutter pb-8" data-testid="settings-screen">
        <SettingsGroup title="Application">
          <SettingsList>
            <SettingsRow
              icon={PaintBrush}
              label="Appearance"
              description="Theme, accent, text size, motion"
              value={summary}
              onClick={() => navigate('/profile/settings/appearance')}
              testId="settings-appearance-row"
            />
            <SettingsRow
              icon={Info}
              label="About"
              description="Version, arc dates, reset"
              onClick={() => navigate('/profile/settings/about')}
              testId="settings-about-row"
            />
          </SettingsList>
        </SettingsGroup>

        <p className="mt-6 px-1 text-xs leading-[1.5] text-faint">
          Appearance settings live on this device only. They are not part of the arc record,
          so they survive a reset and never travel to another phone — text size on a phone
          should not follow you to a tablet.
        </p>

        <p className="mt-3 px-1 font-mono text-xxs tabular-nums text-faint">
          Text scale {TEXT_SCALE_LABELS[settings.textScale]} · {settings.density} ·{' '}
          {settings.motion} motion · art {settings.art}
        </p>
      </div>
    </>
  );
}
