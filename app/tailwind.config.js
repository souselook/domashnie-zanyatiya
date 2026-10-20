/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8ED',
        sand: '#F5E7D3',
        cocoa: '#5B4633',
        amber1: '#E8A13C',
        leaf: '#7FA65A',
      },
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
