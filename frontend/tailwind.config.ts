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
          subtle: 'hsl(var(--accent-subtle))',
        },
        status: {
          success: 'hsl(var(--status-success))',
          'success-bg': 'hsl(var(--status-success-bg))',
          'success-border': 'hsl(var(--status-success-border))',
          warning: 'hsl(var(--status-warning))',
          'warning-bg': 'hsl(var(--status-warning-bg))',
          'warning-border': 'hsl(var(--status-warning-border))',
          error: 'hsl(var(--status-error))',
          'error-bg': 'hsl(var(--status-error-bg))',
          'error-border': 'hsl(var(--status-error-border))',
          info: 'hsl(var(--status-info))',
          'info-bg': 'hsl(var(--status-info-bg))',
          'info-border': 'hsl(var(--status-info-border))',
        },
        error: 'hsl(var(--status-error))',
        warn: 'hsl(var(--status-warning))',
        success: 'hsl(var(--status-success))',
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Enforce Phase 1 Design Direction: Nothing below 12px. Primary reading text 16px.
        'caption': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }], // 12px min
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }], // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px (secondary, log, code)
        'base': ['1rem', { lineHeight: '1.5rem' }], // 16px (body reading text)
        'card-title': ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600' }], // 17px
        'lg': ['1.125rem', { lineHeight: '1.625rem' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        'section': ['1.375rem', { lineHeight: '1.875rem', fontWeight: '600' }], // 22px
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
        'page-title': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }], // 30px
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        focus: '0 0 0 2px hsl(var(--bg-base)), 0 0 0 4px hsl(var(--accent))',
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '250ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
