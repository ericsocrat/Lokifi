import type { Config } from 'tailwindcss';

/**
 * Lokifi Tailwind Configuration
 * Integrates with our comprehensive theme system (lib/theme.ts)
 * Theme: "Dark Terminal Elegance" - Professional Trading Platform
 */

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Brand colors
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          glow: 'rgba(59, 130, 246, 0.5)',
        },

        // Secondary brand colors
        secondary: {
          DEFAULT: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
        },

        // Trading colors
        trading: {
          up: '#10B981',
          'up-light': '#34D399',
          down: '#EF4444',
          'down-light': '#F87171',
        },

        // Background layers
        bg: {
          base: '#0B0B0F',
          primary: '#1A1A1A',
          secondary: '#262626',
          tertiary: '#333333',
          hover: '#2D2D2D',
          elevated: '#3A3A3A',
        },

        // Asset type colors
        asset: {
          stock: '#3B82F6',
          crypto: '#F59E0B',
          forex: '#10B981',
          commodity: '#8B5CF6',
          index: '#EC4899',
        },

        // Legacy compatibility
        electric: '#3B82F6',
        ember: '#F97316',
      },

      // Border radius
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      // Box shadows with glow effects
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.5)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.5)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5)',
        'focus-ring': '0 0 0 3px rgba(59, 130, 246, 0.3)',
      },

      // Background images (gradients)
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        'gradient-radial':
          'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },

      // Font family
      fontFamily: {
        sans: [
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Roboto"',
          'sans-serif',
        ],
        mono: ['"Roboto Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite',
      },

      // Keyframes
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
      },

      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
