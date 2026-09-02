/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{ts,tsx,html}',
    './src/content-scripts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        vigil: {
          safe: '#22c55e',
          caution: '#f59e0b',
          danger: '#ef4444',
          primary: '#3b82f6',
          dark: '#1e293b',
          surface: '#f8fafc',
        },
      },
      width: {
        popup: '380px',
      },
      maxHeight: {
        popup: '520px',
      },
    },
  },
  plugins: [],
};
