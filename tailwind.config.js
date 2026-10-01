/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', 'surface-2': 'var(--surface-2)', line: 'var(--border)',
        ink: 'var(--text)', 'ink-2': 'var(--text-2)', 'ink-3': 'var(--text-3)',
        primary: 'var(--primary)', 'primary-hover': 'var(--primary-hover)', 'primary-soft': 'var(--primary-soft)', navy: 'var(--navy)',
        success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)',
      },
      boxShadow: { pop: '0 8px 24px -8px rgba(20,33,61,.18), 0 2px 6px -2px rgba(20,33,61,.08)' },
      borderRadius: { md: '6px', lg: '10px' },
    },
  },
  plugins: [],
};
