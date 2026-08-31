/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'state-complete': 'var(--state-complete)',
        'state-pending': 'var(--state-pending)',
        'state-recover': 'var(--state-recover)',
        'state-alert': 'var(--state-alert)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        1: 'var(--sp-1)',
        2: 'var(--sp-2)',
        3: 'var(--sp-3)',
        4: 'var(--sp-4)',
        6: 'var(--sp-6)',
        8: 'var(--sp-8)',
        12: 'var(--sp-12)',
      },
      // final/06-ux-screens-design.md §4.2 — the product's type scale.
      fontSize: {
        xl: ['32px', { lineHeight: '36px', fontWeight: '600' }],
        lg: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        md: ['17px', { lineHeight: '24px', fontWeight: '500' }],
        sm: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        xs: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        xxs: ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.08em' }],
      },
    },
  },
  plugins: [],
};
