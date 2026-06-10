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
        minimal: {
          bg: '#F5F5F7',
          surface: '#FFFFFF',
          text: '#1D1D1F',
          secondary: '#86868B',
          tertiary: '#AEAEB2',
          border: '#D2D2D7',
          accent: '#0071E3',
          'accent-hover': '#0077ED',
          'accent-active': '#006edb',
          success: '#34C759',
          warning: '#FF9F0A',
          error: '#FF3B30',
          glass: 'rgba(255,255,255,0.72)',
          'glass-border': 'rgba(255,255,255,0.5)',
          'glass-highlight': 'rgba(255,255,255,0.9)',
          'dark-bg': '#1C1C1E',
          'dark-surface': '#2C2C2E',
          'dark-text': '#F5F5F7',
          'dark-secondary': '#98989D',
          'dark-tertiary': '#636366',
          'dark-border': '#38383A',
          'dark-glass': 'rgba(44,44,46,0.72)',
          'dark-glass-border': 'rgba(56,56,58,0.8)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        minimal: '16px',
      },
      boxShadow: {
        minimal: '0 1px 3px rgba(0,0,0,0.06)',
        'minimal-md': '0 4px 12px rgba(0,0,0,0.08)',
        'minimal-glass': '0 8px 32px rgba(0,0,0,0.08)',
        'minimal-glow': 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
    },
  },
  plugins: [],
};
