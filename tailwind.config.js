/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        km: {
          primary: '#2E7D32',
          primaryDark: '#1B5E20',
          primaryLight: '#4CAF50',
          secondary: '#81C784',
          accent: '#F9A825',
          accentLight: '#FFF59D',
          bg: '#F7FAF5',
          surface: '#FFFFFF',
          textPrimary: '#1B1B1B',
          textSecondary: '#667066',
          danger: '#D32F2F',
          warning: '#F9A825',
          success: '#2E7D32',
          card: '#FFFFFF',
          border: '#E2E8F0',
          hoverBg: '#EDF4E9'
        }
      },
      borderRadius: {
        'km': '16px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'km-sm': '0 2px 8px rgba(46, 125, 50, 0.08)',
        'km-md': '0 4px 16px rgba(46, 125, 50, 0.12)',
        'km-lg': '0 10px 25px -3px rgba(46, 125, 50, 0.15)',
      }
    },
  },
  plugins: [],
}
