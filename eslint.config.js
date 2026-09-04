import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    // scripts/ is one-off Node tooling (icon generation), not app or test
    // code — it runs under Node globals this config doesn't declare.
    ignores: [
      'dist/**',
      'dev-dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // ── The engine boundary ────────────────────────────────────────────────
  // src/engine/ must be pure and deterministic: no React, no Dexie, no
  // Zustand, no DOM globals, no ambient clock/randomness/uuid. The clock
  // and id generator are always injected via EngineDeps. Applies to every
  // engine file, implemented or not — this restriction never shrinks.
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react*',
            'react-dom*',
            'dexie*',
            'zustand*',
            'uuid',
            '**/db/*',
            '**/store/*',
            '**/ui/*',
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'indexedDB',
        'navigator',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Inject the clock — see EngineDeps.now().' },
        { object: 'Math', property: 'random', message: 'Inject randomness — engine/ must stay deterministic.' },
        { object: 'crypto', property: 'randomUUID', message: 'Inject the id generator — see EngineDeps.newId().' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Inject the clock — no `new Date()` in engine/.',
        },
      ],
    },
  },
  // ── Stub-args allowance — shrinks every slice ──────────────────────────
  // Phase 0 stub functions have full typed signatures but throw
  // 'Not implemented — Slice N' instead of a body (final/09 Step 3), so
  // their parameters are intentionally unused. As each file gets a real
  // implementation it comes OFF this file list. Slice 1: quests.ts's
  // generateCoreQuestTemplates. Slice 2: quests.ts's generateQuests and
  // reduce.ts. Slice 3: xp.ts and level.ts. Slice 4: streak.ts — all
  // fully implemented; any still-unused parameter in an implemented file
  // is `void`-guarded per call site instead of blanket-allowed. Repeat
  // this shrinking every slice as rank.ts, attributes.ts, etc. land.
  {
    files: ['src/engine/**/*.ts'],
    ignores: [
      'src/engine/quests.ts',
      'src/engine/reduce.ts',
      'src/engine/xp.ts',
      'src/engine/level.ts',
      'src/engine/streak.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    },
  }
);
