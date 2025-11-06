/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'text-primary': '#1d1d1f',
        'text-secondary': '#f5f5f7',
        'accent': '#0071e3',
      },
      fontFamily: {
        'sans': ['OpenAI Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontWeight: {
        'light': 300,
        'normal': 400,
        'medium': 500,
        'semibold': 600,
        'bold': 700,
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '6px',
      }
    },
  },
  plugins: [],
}