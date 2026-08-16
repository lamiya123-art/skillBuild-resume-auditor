import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#111827',
        'surface-border': '#1f293d',
        accent: '#6366f1',
        'accent-hover': '#4f46e5',
        tier0: '#64748b',
        tier1: '#3b82f6',
        tier2: '#a855f7',
        tier3: '#10b981',
      },
    },
  },
  plugins: [],
}
export default config
