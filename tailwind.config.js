/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0f1e',
          900: '#0d1526',
          800: '#111d35',
          700: '#162444'
        },
        gold: {
          DEFAULT: '#d4a853',
          light: '#e8c278',
          dark: '#b8893a'
        },
        jade: {
          DEFAULT: '#2d8a6e',
          light: '#3aad8a',
          dark: '#1e6b55'
        },
        vermillion: '#c0392b',
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
