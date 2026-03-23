import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        ink:    '#000000',
        paper:  '#ffffff',
        cream:  '#f2f2f2',
        accent: '#00ff97',
        'accent-hover': '#00e085',
        'accent-light': '#e6fff5',
        muted:  '#666666',
        border: '#e0e0e0',
        success:       '#00cc78',
        danger:        '#b91c1c',
        'danger-light':'#fee2e2',
      },
      borderRadius: {
        btn:   '6px',
        card:  '10px',
        modal: '12px',
        pill:  '20px',
      },
      fontSize: {
        '2xs': ['0.72rem', { lineHeight: '1rem' }],
        label: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      letterSpacing: {
        tighter: '-0.03em',
        label:    '0.06em',
      },
    },
  },
  plugins: [],
}
export default config
