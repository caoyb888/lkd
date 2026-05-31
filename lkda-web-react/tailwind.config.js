/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#14B8A6',
          light: '#5EEAD4',
          dark: '#0F766E',
        },
        accent: '#FB923C',
        background: {
          main: '#FFFFFF',
          aside: '#ECFDF5',
          soft: '#F0FDFA',
        },
        slate: {
          title: '#1E293B',
          body: '#475569',
        },
      },
      borderRadius: {
        card: '16px',
        btn: '8px',
        tag: '999px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(20, 184, 166, 0.08)',
      },
    },
  },
  plugins: [],
}
