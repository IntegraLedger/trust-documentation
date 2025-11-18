/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './theme.config.tsx',
  ],
  theme: {
    extend: {
      colors: {
        'integra-dark-blue': '#010044',
        'integra-medium-blue': '#001B5A',
        'integra-blue': '#0041B1',
        'integra-green': '#00CC77',
      },
    },
  },
  plugins: [],
}
