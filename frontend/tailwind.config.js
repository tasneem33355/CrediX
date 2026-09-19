/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          subtle: 'rgb(var(--surface-subtle) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        brand: {
          // Primary Navy Brand System (Landing Page Identity)
          navy: {
            DEFAULT: '#1B3A5C', // Primary Navy
            dark: '#132B45',   // Deep Navy Shade
            light: '#2A4D73',  // Secondary / Active Tint Navy
            muted: '#5A6B7D',  // Slate Body Text
            subtle: 'rgba(27, 58, 92, 0.08)',
          },
          // Charcoal remapped to Navy system for consistency
          charcoal: {
            DEFAULT: '#1B3A5C',
            dark: '#132B45',
            light: '#2A4D73',
            muted: '#5A6B7D',
            subtle: 'rgba(27, 58, 92, 0.08)',
          },
          // Gold remapped to Navy-compatible tokens
          gold: {
            DEFAULT: '#1B3A5C',
            hover: '#132B45',
            light: '#2A4D73',
            muted: '#5A6B7D',
            subtle: 'rgba(27, 58, 92, 0.08)',
            bg: '#E8EEF5',
            border: '#D7E2E8',
          },
          blue: {
            DEFAULT: '#1B3A5C',
            hover: '#132B45',
            light: '#2A4D73',
            subtle: 'rgba(27, 58, 92, 0.08)',
          },
          cyan: {
            DEFAULT: '#2A4D73',
            hover: '#1B3A5C',
            light: '#E8EEF5',
            subtle: 'rgba(27, 58, 92, 0.08)',
          },
        },
        semantic: {
          success: {
            DEFAULT: '#2E9E5B', // Accent/success green matching landing page
            bg: '#EAF7EE',
            subtle: 'rgba(46, 158, 91, 0.12)',
            border: '#B8E4C9',
          },
          warning: {
            DEFAULT: '#D97706',
            bg: '#FFFBEB',
            subtle: 'rgba(217, 119, 6, 0.12)',
            border: '#FDE68A',
          },
          error: {
            DEFAULT: '#DC2626',
            bg: '#FEF2F2',
            subtle: 'rgba(220, 38, 38, 0.12)',
            border: '#FECACA',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'scan-line': 'scan 4s ease-in-out infinite',
        'spin-slow': 'spinSlow 28s linear infinite',
        'spin-reverse': 'spinReverse 22s linear infinite',
        'shield-breathe': 'shieldBreathe 3.5s ease-in-out infinite',
        'ring-pulse': 'ringPulse 4s ease-in-out infinite',
        'data-orbit': 'orbit 12s linear infinite',
        'data-orbit-reverse': 'orbitReverse 9s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(-85px)', opacity: '0.2' },
          '50%': { transform: 'translateY(85px)', opacity: '0.95' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        spinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        shieldBreathe: {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 10px rgba(27, 58, 92, 0.35))' },
          '50%': { transform: 'scale(1.04)', filter: 'drop-shadow(0 0 20px rgba(27, 58, 92, 0.50))' },
        },
        ringPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.35' },
          '50%': { transform: 'scale(1.03)', opacity: '0.65' },
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(115px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(115px) rotate(-360deg)' },
        },
        orbitReverse: {
          from: { transform: 'rotate(180deg) translateX(72px) rotate(-180deg)' },
          to: { transform: 'rotate(540deg) translateX(72px) rotate(-540deg)' },
        },
      },
      boxShadow: {
        'fintech-sm': '0 1px 3px 0 rgba(27, 58, 92, 0.04)',
        'fintech-md': '0 4px 14px -2px rgba(27, 58, 92, 0.06), 0 2px 6px -1px rgba(27, 58, 92, 0.03)',
        'fintech-lg': '0 12px 28px -4px rgba(27, 58, 92, 0.08), 0 4px 12px -2px rgba(27, 58, 92, 0.03)',
        'glow-gold': '0 0 20px -3px rgba(27, 58, 92, 0.22)',
        'glow-blue': '0 0 20px -3px rgba(27, 58, 92, 0.22)', // Alias for compatibility
        'glow-cyan': '0 0 20px -3px rgba(42, 77, 115, 0.20)', // Alias for compatibility
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'smooth': '300ms',
        'drawer': '350ms',
      },
      transitionTimingFunction: {
        'smooth-in': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'smooth-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      width: {
        'sidebar': '16rem',
        'sidebar-collapsed': '4.5rem',
      },
    },
  },
  plugins: [],
};
