import { Database, Info, PaintBrush, SlidersHorizontal, Cpu, ShieldCheck, Lightning } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings } from '../../store/SettingsContext';
import { ACCENTS } from '../../store/settings';
import { ScreenHeader, SettingsGroup, SettingsList, SettingsRow } from '../kit';
import { THEME_LABELS, TEXT_SCALE_LABELS } from './labels';

/**
 * The settings index. Each section is a pushed route.
 * Upgraded with a Solo Leveling System Control Center aesthetic.
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const summary =
    settings.accent === 'theme'
      ? THEME_LABELS[settings.theme]
      : `${THEME_LABELS[settings.theme]} · ${ACCENTS[settings.accent].label}`;

  return (
    <>
      <ScreenHeader title="SETTINGS" onBack={() => navigate('/profile')} visuallyHidden />
      <div className="px-gutter pb-8 pt-2" data-testid="settings-screen">
        {/* System Control Panel Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-mid shadow-[0_0_10px_#5fb2ff] animate-pulse" />
              <span className="text-[9px] uppercase font-mono tracking-[0.22em] text-accent-mid font-bold">
                SYSTEM CORE // CONFIG PROTOCOL
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold leading-none tracking-[0.14em] text-ink-100 glow-text">
              SETTINGS
            </h1>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-700 mt-1">
              PLAYER SYSTEM PROTOCOL & PREFERENCES
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-accent/40 bg-accent-deep/30 shadow-[0_0_8px_rgba(77,163,255,0.25)]">
              <ShieldCheck size={13} weight="fill" color="#5fb2ff" />
              <span className="text-[9px] font-mono font-bold tracking-widest text-accent-mid uppercase">
                SYS ONLINE
              </span>
            </div>
          </div>
        </motion.div>

        {/* System Status Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="cut-md relative mb-5 overflow-hidden p-4"
          style={{
            border: '1px solid rgba(77, 163, 255, 0.35)',
            background: 'linear-gradient(180deg, rgba(10, 20, 36, 0.92), rgba(5, 10, 20, 0.98))',
            boxShadow: '0 0 24px rgba(77, 163, 255, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3 border-b border-hair-faint pb-2">
            <div className="flex items-center gap-2">
              <Cpu size={18} weight="fill" color="#5fb2ff" className="drop-shadow-[0_0_8px_#5fb2ff]" />
              <span className="text-xs font-bold uppercase tracking-wider text-ink-100">
                SYSTEM OVERRIDE STATUS
              </span>
            </div>
            <span className="text-[9px] font-mono text-accent-mid bg-accent-deep/40 px-2 py-0.5 rounded border border-accent/30 font-bold">
              MONARCH CORE v1.0
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-surface/60 border border-hair-faint">
              <div className="text-[9px] uppercase font-mono text-ink-700">ACTIVE ENGINE</div>
              <div className="font-mono text-xs font-bold text-accent-mid mt-0.5 flex items-center gap-1">
                <Lightning size={12} weight="fill" color="#5fb2ff" />
                <span>OFFLINE LOCAL DB</span>
              </div>
            </div>
            <div className="p-2 rounded bg-surface/60 border border-hair-faint">
              <div className="text-[9px] uppercase font-mono text-ink-700">THEME MODE</div>
              <div className="font-mono text-xs font-bold text-ink-100 mt-0.5 uppercase truncate">
                {settings.theme}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Section */}
        <SettingsGroup title="Application Protocols">
          <SettingsList>
            <SettingsRow
              icon={PaintBrush}
              label="Appearance"
              description="Theme, accent, text size, motion intensity"
              value={summary}
              onClick={() => navigate('/profile/settings/appearance')}
              testId="settings-appearance-row"
            />
            <SettingsRow
              icon={SlidersHorizontal}
              label="System Protocol"
              description="Reminders, intentions, daily operating hours"
              onClick={() => navigate('/profile/settings/system')}
              testId="settings-system-row"
            />
            <SettingsRow
              icon={Database}
              label="Data Vault"
              description="IndexedDB backup, paper import, integrity diagnostics"
              onClick={() => navigate('/profile/settings/data')}
              testId="settings-data-row"
            />
            <SettingsRow
              icon={Info}
              label="About System"
              description="Version build, arc timeline, systemic reset"
              onClick={() => navigate('/profile/settings/about')}
              testId="settings-about-row"
            />
          </SettingsList>
        </SettingsGroup>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 px-1 text-xs leading-[1.5] text-ink-500 font-medium"
        >
          Appearance protocols are bound locally to this device instance. They operate in complete isolation from arc records to ensure zero cross-device layout distortion.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-2.5 rounded cut-sm border border-accent/20 bg-accent-deep/10 font-mono text-xxs tabular-nums text-accent-mid/80 flex items-center justify-between"
        >
          <span>TEXT SCALE: {TEXT_SCALE_LABELS[settings.textScale]}</span>
          <span>DENSITY: {settings.density.toUpperCase()}</span>
          <span>MOTION: {settings.motion.toUpperCase()}</span>
        </motion.div>
      </div>
    </>
  );
}

