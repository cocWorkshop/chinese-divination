/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Legacy structural palette — dark-first surfaces still on the
           migration path (P4 waves). Do NOT use in new code. */
        navy: {
          950: '#0a0f1e',
          900: '#0d1526',
          800: '#111d35',
          700: '#162444'
        },
        /* Brand palette — RGB-channel vars so /opacity modifiers resolve
           per-theme (宣纸 darkened golds vs 玄夜 bright golds). */
        gold: {
          DEFAULT: 'rgb(var(--gold-rgb) / <alpha-value>)',
          light: 'rgb(var(--gold-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--gold-dark-rgb) / <alpha-value>)'
        },
        jade: {
          DEFAULT: 'rgb(var(--jade-rgb) / <alpha-value>)',
          light: '#3aad8a',
          dark: '#1e6b55'
        },
        vermillion: 'rgb(var(--vermillion-rgb) / <alpha-value>)',
        /* Semantic dual-mode tokens — the ONLY sanctioned vocabulary for
           new UI (see docs/planning/ui-restyle-2026-10.md §2.4-2.5).
           Surface-family colors use RGB channels so /alpha tints resolve
           per-theme too. */
        background: 'rgb(var(--bg-primary-rgb) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
        card: 'var(--bg-card)',
        foreground: 'rgb(var(--fg-rgb) / <alpha-value>)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        scrim: 'var(--scrim)',
        input: 'var(--input-bg)'
      },
      fontFamily: {
        serif: ['var(--font-noto-serif)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'radial-navy': 'radial-gradient(ellipse at center, #162444 0%, #0a0f1e 70%)',
      },
    },
  },
  plugins: [],
}
