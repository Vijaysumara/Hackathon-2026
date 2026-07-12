/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f6fc',
          100: '#e8ecf9',
          200: '#cbd5f1',
          300: '#a3b6e5',
          400: '#7490d5',
          500: '#5270c5',
          600: '#3f55ab',
          700: '#33448a',
          800: '#2d3a72',
          900: '#293260',
          950: '#1b1f3c',
        },
        odoo: {
          purple: '#714B67',
          darkPurple: '#56394F',
          gold: '#E9A115',
          lightPurple: '#F5F0F4'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
