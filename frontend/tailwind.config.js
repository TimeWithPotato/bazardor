/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F7F2',
        ink: '#17241D',
        leaf: { DEFAULT: '#1F5C3F', dark: '#16452F', soft: '#E3EDE5' },
        turmeric: { DEFAULT: '#E3A21A', soft: '#FBEFD3' },
        chili: { DEFAULT: '#C2412D', soft: '#F7E1DC' },
        moss: { DEFAULT: '#3E8A5A', soft: '#E1F0E6' },
        slate: '#5E6B63',
        line: '#DCE3DB',
      },
      fontFamily: {
        display: ['"Anek Bangla"', 'system-ui', 'sans-serif'],
        body: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
