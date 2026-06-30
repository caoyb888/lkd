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
        // 自适应 token（暗色值与原硬编码一致），随主题切换；全站无透明度修饰符
        background: {
          main: 'var(--surface)',
          aside: 'var(--surface)',
          soft: 'var(--surface-2)',
        },
        // merges into Tailwind's built-in slate scale (50..950 stay available)
        // 指向自适应 token —— 正文/标题在 岩层(暗)/本色(亮) 两套主题下都清晰
        // (--text / --text-dim 的暗色值与原硬编码一致，故暗色主题外观不变；
        //  这两个工具类全站均无透明度修饰符，去掉 <alpha-value> 安全)
        slate: {
          title: 'var(--text)',
          body: 'var(--text-dim)',
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
