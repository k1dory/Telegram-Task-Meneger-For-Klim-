/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: withAlpha('--color-primary-50'),
          100: withAlpha('--color-primary-100'),
          200: withAlpha('--color-primary-200'),
          300: withAlpha('--color-primary-300'),
          400: withAlpha('--color-primary-400'),
          500: withAlpha('--color-primary-500'),
          600: withAlpha('--color-primary-600'),
          700: withAlpha('--color-primary-700'),
          800: withAlpha('--color-primary-800'),
          900: withAlpha('--color-primary-900'),
        },
        dark: {
          50: withAlpha('--color-dark-50'),
          100: withAlpha('--color-dark-100'),
          200: withAlpha('--color-dark-200'),
          300: withAlpha('--color-dark-300'),
          400: withAlpha('--color-dark-400'),
          500: withAlpha('--color-dark-500'),
          600: withAlpha('--color-dark-600'),
          700: withAlpha('--color-dark-700'),
          800: withAlpha('--color-dark-800'),
          900: withAlpha('--color-dark-900'),
          950: withAlpha('--color-dark-950'),
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
    },
  },
  plugins: [],
}
