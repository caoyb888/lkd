/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 灵动智档 · 岩层 (STRATA) — brand teal as the single accent
        primary: {
          DEFAULT: 'oklch(0.74 0.122 182 / <alpha-value>)',
          light: 'oklch(0.82 0.10 182 / <alpha-value>)',
          dark: 'oklch(0.62 0.12 182 / <alpha-value>)',
        },
        accent: 'oklch(0.74 0.122 64 / <alpha-value>)', // ore / copper
        background: {
          main: 'oklch(0.205 0.008 168 / <alpha-value>)',
          aside: 'oklch(0.205 0.008 168 / <alpha-value>)',
          soft: 'oklch(0.245 0.009 168 / <alpha-value>)',
        },
        // merges into Tailwind's built-in slate scale (50..950 stay available)
        slate: {
          title: 'oklch(0.955 0.008 150 / <alpha-value>)',
          body: 'oklch(0.74 0.010 160 / <alpha-value>)',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Noto Sans SC"', 'serif'],
        mono: ['"Space Mono"', '"Space Grotesk"', 'monospace'],
      },
      borderRadius: {
        card: '10px',
        btn: '4px',
        tag: '999px',
      },
      boxShadow: {
        card: '0 1px 0 oklch(1 0 0 / 0.04) inset, 0 18px 40px -24px oklch(0 0 0 / 0.8)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
