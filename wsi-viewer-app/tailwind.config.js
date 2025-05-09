/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f8ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a4bcfc',
          400: '#8098f9',
          500: '#6272f2',
          600: '#4e4fe6',
          700: '#3b3bce',
          800: '#3034a4',
          900: '#2c3380',
        },
      },
    },
  },
  plugins: [],
} 