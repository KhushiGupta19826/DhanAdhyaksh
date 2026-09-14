/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        brand: {
          DEFAULT: '#0f766e', // calm deep teal
          light: '#14b8a6',
          dark: '#115e59',
        },
      },
    },
  },
  plugins: [],
}
