import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#211C1F',
        ink: '#171519',
        pink: { DEFAULT: '#FF66BF', soft: '#FFE3F3', dark: '#E0479F' },
        teal: { DEFAULT: '#0F5257', soft: '#E1EEEE', light: '#2C7A80' },
        mauve: '#EDE3E9',
        muted: '#61575C',
        soft: '#EBEDEE',
        success: '#238B68',
        warning: '#E6A23C',
        danger: '#D94F4F',
      },
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,21,25,0.04), 0 4px 16px rgba(23,21,25,0.05)',
        lift: '0 12px 40px rgba(23,21,25,0.12)',
      },
      maxWidth: { site: '1200px' },
    },
  },
  plugins: [],
} satisfies Config;
