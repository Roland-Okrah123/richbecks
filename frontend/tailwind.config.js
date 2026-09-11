/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#1a1d24',
          light: '#242832',
          lighter: '#2e3340',
        },
        gold: {
          DEFAULT: '#d4a537',
          light: '#e8c565',
          dark: '#a97f22',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        goldGlow: '0 0 0 1px rgba(212,165,55,0.4)',
      },
    },
  },
  plugins: [],
};
