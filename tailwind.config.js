/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'blazr-red': '#FF0000',
      },
      width: {
        'popup': '400px',
      },
    },
  },
  plugins: [],
} 