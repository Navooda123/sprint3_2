/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nestleBlue: '#009FDA',
        nestleRed: '#E2001A',
        nestleBg: '#F5F5F5',
      },
    },
  },
  plugins: [],
}
