/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./taskpane.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'tp': '350px',  // task-pane breakpoint for Office add-in
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Ink neutrals - warm-tinted grays for editorial feel
        ink: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
        // Audyn brand blues
        audyn: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Score colors - bold and saturated (not pastels)
        score: {
          critical: {
            DEFAULT: '#EF4444',
            light: '#FEE2E2',
            dark: '#DC2626',
            text: '#991B1B',
            glow: 'rgba(239, 68, 68, 0.4)',
          },
          caution: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#D97706',
            text: '#92400E',
            glow: 'rgba(245, 158, 11, 0.4)',
          },
          success: {
            DEFAULT: '#22C55E',
            light: '#DCFCE7',
            dark: '#16A34A',
            text: '#166534',
            glow: 'rgba(34, 197, 94, 0.4)',
          },
        },
      },
      boxShadow: {
        // Refined card shadows for depth
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'lifted': '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
        // Glow variants for score colors
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        // Inner shadow for thumbnails
        'inner-subtle': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'draw-line': 'draw-line 800ms ease-out forwards',
        'pop-in': 'pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 200ms ease-out forwards',
        'slide-up': 'slide-up 300ms ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snap': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'score-gradient-red': 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        'score-gradient-amber': 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        'score-gradient-green': 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
      },
    },
  },
  plugins: [],
}
