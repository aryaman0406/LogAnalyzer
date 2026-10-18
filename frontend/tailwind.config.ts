import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'hsl(var(--bg-base))',
          raised: 'hsl(var(--bg-raised))',
          overlay: 'hsl(var(--bg-overlay))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          hover: 'hsl(var(--surface-hover))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          hover: 'hsl(var(--border-hover))',
        },
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          muted: 'hsl(var(--text-muted))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          muted: 'hsl(var(--accent-muted))',
        },
        error: 'hsl(var(--error))',
        warn: 'hsl(var(--warn))',
        success: 'hsl(var(--success))',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1rem' }],
        'sm': ['0.75rem', { lineHeight: '1.125rem' }],
        'base': ['0.8125rem', { lineHeight: '1.25rem' }],
        'lg': ['0.9375rem', { lineHeight: '1.375rem' }],
        'xl': ['1.125rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
        'hero': ['3.5rem', { lineHeight: '3.75rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 2px hsl(0 0% 0% / 0.15)',
        DEFAULT: '0 2px 8px hsl(0 0% 0% / 0.2)',
        lg: '0 4px 16px hsl(0 0% 0% / 0.25)',
        glow: '0 0 20px hsl(var(--accent) / 0.15)',
        'glow-strong': '0 0 30px hsl(var(--accent) / 0.25)',
        card: '0 1px 3px hsl(0 0% 0% / 0.1), 0 0 0 1px hsl(var(--border))',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '200ms',
        slow: '400ms',
        spring: '500ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px hsl(var(--accent) / 0.15)' },
          '50%': { boxShadow: '0 0 24px hsl(var(--accent) / 0.3)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-up': 'fade-up 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        spin: 'spin 1s linear infinite',
        'skeleton-shimmer': 'skeleton-shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
