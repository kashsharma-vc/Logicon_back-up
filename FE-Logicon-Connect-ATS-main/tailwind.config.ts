import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          border: 'var(--color-border)',
          text: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          subtle: 'var(--color-text-muted)',
          heading: 'var(--color-heading)',
          link: 'var(--color-link)',
          accent: 'var(--color-accent-fill)',
        },
        nav: {
          bg: 'var(--color-nav-bg)',
          border: 'var(--color-nav-border)',
          label: 'var(--color-nav-label)',
          link: 'var(--color-nav-link)',
          'link-hover': 'var(--color-nav-link-hover)',
          wordmark: 'var(--color-nav-wordmark)',
          'icon-hover': 'var(--color-nav-icon-button-hover)',
          overlay: 'var(--color-nav-overlay)',
          active: 'var(--color-nav-active-border)',
        },
        brand: {
          900: 'var(--color-primary-900)',
          800: 'var(--color-primary-800)',
          700: 'var(--color-primary-700)',
          600: 'var(--color-primary-600)',
          500: 'var(--color-primary-500)',
          400: 'var(--color-primary-400)',
        },
        status: {
          info: 'var(--color-info)',
          neutral: 'var(--color-neutral)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          hired: 'var(--color-hired)',
          attention: 'var(--color-attention)',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 23, 42, 0.06)',
        'nav-inset': 'inset -1px 0 0 var(--color-nav-inset-line)',
        'nav-drawer': '4px 0 24px var(--color-nav-drawer-shadow)',
      },
      ringColor: {
        nav: 'var(--color-nav-focus-ring)',
      },
      borderRadius: {
        panel: '8px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-in': 'slide-in 0.25s ease-out both',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-in': 'slide-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
