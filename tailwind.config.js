/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        editorial: [
          'Charter',
          '"Newsreader"',
          'Cambria',
          'Georgia',
          'serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      colors: {
        pill: {
          dimension: {
            DEFAULT: '#2563eb',
            hover: '#1d4ed8',
            bg: '#eff6ff',
            border: '#93c5fd',
            text: '#1e40af',
          },
          measure: {
            DEFAULT: '#16a34a',
            hover: '#15803d',
            bg: '#f0fdf4',
            border: '#86efac',
            text: '#166534',
          },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'editorial': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
